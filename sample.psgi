use strict;
use warnings;
use Amon2::Lite;
use Plack::App::File;
use FindBin;
use JavaScript::Value::Escape;
use jQluster::Server;
use JSON qw(from_json to_json);
use Scalar::Util qw(weaken refaddr);
use Try::Tiny;

my $JQLUSTER_DIR = "$FindBin::RealBin/js";

my @JQLUSTER_FILES = qw(util.js
                        connection.js
                        connection_websocket.js
                        transport.js
                        remote_selector.js
                        remote_selector_factory.js
                        jquery_adaptor.js
                   );

__PACKAGE__->load_plugin("Web::WebSocket");

__PACKAGE__->template_options(
    function => {
        js => \&javascript_value_escape,
        json => \&to_json,
    }
);

get '/single.html' => sub {
    my ($c) = @_;
    return $c->render('single.tt');
};

get '/jqluster.js' => sub {
    my ($c) = @_;
    my $total = "";
    foreach my $filename (@JQLUSTER_FILES) {
        open my $file, "<", "$JQLUSTER_DIR/$filename" or die "Cannot open $filename";
        $total .= do { local $/; <$file> };
        close $file;
    }
    return $c->create_response(200, ["Content-Type" => "application/javascript",
                                     "Content-Length" => length($total)],
                               [$total]);
};


my $jqluster_server = jQluster::Server->new;

my $WEBSOCKET_ENDPOINT = "/jqluster/endpoint";

any $WEBSOCKET_ENDPOINT => sub {
    my ($c) = @_;
    return $c->websocket(sub {
        my $ws = shift; ## $ws is a Amon2::Web::WebSocket https://metacpan.org/module/Amon2::Web::WebSocket
        weaken($ws);
        my $registered = 0;
        $ws->on_receive_message(sub {
            my ($c, $message) = @_;
            return if !$ws;
            my $message_obj = try {
                from_json($message);
            }catch {
                undef;
            };
            return if !$message_obj;

            if($registered) {
                $jqluster_server->distribute($message_obj);
            }else {
                $registered = 1;
                $jqluster_server->register(
                    unique_id => refaddr($ws),
                    message => $message_obj,
                    sender => sub {
                        my ($my_message_obj) = @_;
                        return if !$ws;
                        $ws->send_message(to_json($my_message_obj));
                    }
                );
            }
        });
        my $unregister = sub {
            return if !$ws || !$registered;
            $jqluster_server->unregister(refaddr($ws));
        };
        $ws->on_eof($unregister);
        $ws->on_error($unregister);
    });
};

sub jqluster_endpoint_url {
    my ($psgi_env) = @_;
    my $host_port = $psgi_env->{HTTP_HOST};
    if(!$host_port) {
        $host_port = "$psgi_env->{SERVER_NAME}:$psgi_env->{SERVER_PORT}";
    }
    return "ws://$host_port$WEBSOCKET_ENDPOINT";
}

my %SIMPLE_ITEMS = (
    alice => [1, 2, 3, 4, 5],
    bob => [qw(one two three four five)]
);

sub valid_remote_id {
    my ($remote_id) = @_;
    return 0 if not defined $remote_id;
    return defined($SIMPLE_ITEMS{$remote_id});
}

get '/get_simple.html' => sub {
    my ($c) = @_;
    my $params = $c->req->query_parameters;
    if(!valid_remote_id($params->{my_id}) || !valid_remote_id($params->{target_id})) {
        return $c->res_405;
    }
    return $c->render(
        "get_simple.tt",
        { my_remote_id => $params->{my_id}, target_remote_id => $params->{target_id},
          items => $SIMPLE_ITEMS{$params->{my_id}},
          websocket_url => jqluster_endpoint_url($c->req->env) }
    );
};

get '/chat.html' => sub {
    my ($c) = @_;
    return $c->render("chat.tt",
                      { websocket_url => jqluster_endpoint_url($c->req->env),
                        is_alone => $c->req->query_parameters->{is_alone}});
};


my @READINESS_NODES = qw(alice bob carol);
my %READINESS_NODES = map { $_ => 1 } @READINESS_NODES;

get '/ready.html' => sub {
    my ($c) = @_;
    my $my_id = $c->req->query_parameters->{my_id};
    if(!defined($my_id) || !$READINESS_NODES{$my_id}) {
        return $c->res_405;
    }
    my %other_nodes = %READINESS_NODES;
    delete $other_nodes{$my_id};
    my @other_nodes = keys %other_nodes;
    return $c->render("ready.tt",
                      { websocket_url => jqluster_endpoint_url($c->req->env),
                        my_id => $my_id, notify_ids => \@other_nodes, listen_ids => \@other_nodes} );
};

get '/' => sub {
    my ($c) = @_;
    return $c->render('index.tt');
};

return __PACKAGE__->to_app(handle_static => 1);
