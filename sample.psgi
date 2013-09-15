use strict;
use warnings;
use Amon2::Lite;
use Plack::Builder;
use FindBin;
use JavaScript::Value::Escape;
use jQluster::PSGI;
use JSON qw(to_json);

__PACKAGE__->template_options(
    function => {
        js => \&javascript_value_escape,
        json => \&to_json,
        jqluster_library => sub { javascript_value_escape(jQluster::PSGI->url_library) },
    }
);

jQluster::PSGI->config(
    library_dir => "$FindBin::RealBin/js",
    mounted_on => "/jqluster",
);

get '/single.html' => sub {
    my ($c) = @_;
    return $c->render('single.tt');
};

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
          websocket_url => jQluster::PSGI->url_websocket($c->req->env) }
    );
};

get '/chat.html' => sub {
    my ($c) = @_;
    return $c->render("chat.tt",
                      { websocket_url => jQluster::PSGI->url_websocket($c->req->env),
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
                      { websocket_url => jQluster::PSGI->url_websocket($c->req->env),
                        my_id => $my_id, notify_ids => \@other_nodes, listen_ids => \@other_nodes} );
};

get '/' => sub {
    my ($c) = @_;
    return $c->render('index.tt');
};

return builder {
    mount(jQluster::PSGI->mounted_app);
    mount "/" => __PACKAGE__->to_app(handle_static => 1);
};

