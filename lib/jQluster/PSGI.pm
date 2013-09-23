package jQluster::PSGI;
use 5.10.0;
use strict;
use warnings;
use base qw(Amon2 Amon2::Web);
use Amon2::Web::Dispatcher::Lite;
use jQluster::Server;
use JSON qw(from_json to_json);
use Scalar::Util qw(weaken refaddr);
use Try::Tiny;


my @JQLUSTER_FILES = qw(util.js
                        connection.js
                        connection_websocket.js
                        local_server.js
                        transport.js
                        transport_loopback.js
                        remote_selector.js
                        readiness_callback_manager.js
                        remote_selector_factory.js
                        jquery_adaptor.js
                   );

my $library_dir = ".";
my $mounted_on = "/";
my $jqluster_server = jQluster::Server->new;

__PACKAGE__->load_plugin("Web::WebSocket");

sub config {
    my ($class, %args) = @_;
    if(defined $args{library_dir}) {
        $library_dir = $args{library_dir};
        $library_dir =~ s{/+$}{};
    }
    $mounted_on = $args{mounted_on} if defined $args{mounted_on};
}

sub mounted_on {
    return $mounted_on;
}

sub mounted_app {
    my ($class) = @_;
    return ($class->mounted_on, $class->to_app);
}

{
    ## "dispatch" method is created by Amon2::Web::Dispatcher::Lite,
    ## but it expects to be called in class-method style
    ## i.e. $class->dispatch($context). On the other hand,
    ## Amon2::Web's "dispatch()" method is called in object-method
    ## style i.e. $context->dispatch(). To fill the gap between the
    ## two methods, we have to manually define dispatch() method in
    ## Amon2::Web context classes.
    ##
    ## This convetion is totally confusing, but
    ## Amon2::Web::Dispatcher::Lite is never meant to be used within
    ## context classes. It should be used in a separate class
    ## dedicated to dispatching. It is I who violate the convention,
    ## so naturally I should pay the fine. Anyway one can argue that
    ## Amon2's convention and composition is complicated and
    ## restrictive. However, that kind of restriction might bring high
    ## productivity if you strictly follow the convention it proposes.
    
    no warnings "redefine";
    my $orig_dispatch = *dispatch{CODE};
    *dispatch = sub {
        my ($self) = @_;
        return $orig_dispatch->(__PACKAGE__, $self);
    };
}

my $ENDPOINT_WEBSOCKET = "/connect";
my $ENDPOINT_LIBRARY = "/jqluster.js";

any $ENDPOINT_WEBSOCKET => sub {
    my ($c) = @_;
    return __PACKAGE__->_websocket_amon2($c);
};

get $ENDPOINT_LIBRARY => sub {
    my ($c) = @_;
    state $cached;
    if(!defined($cached)) {
        my $total = "";
        foreach my $filename (@JQLUSTER_FILES) {
            my $path = "$library_dir/$filename";
            open my $file, "<", $path or die "Cannot open $path: $!";
            $total .= do { local $/; <$file> };
            close $file;
        }
        $cached = $total;
    }
    return $c->create_response(200, ["Content-Type" => "application/javascript",
                                     "Content-Length" => length($cached)],
                               [$cached]);
};

sub _websocket_amon2 {
    my ($class, $context) = @_;
    return $context->websocket(sub {
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
}

sub url_websocket {
    my ($class, $psgi_env) = @_;
    my $host_port = $psgi_env->{HTTP_HOST};
    if(!$host_port) {
        $host_port = "$psgi_env->{SERVER_NAME}:$psgi_env->{SERVER_PORT}";
    }
    my $path_prefix = $class->mounted_on;
    $path_prefix =~ s{/+$}{};
    return "ws://$host_port$path_prefix$ENDPOINT_WEBSOCKET";
}

sub url_library {
    my ($class) = @_;
    my $path_prefix = $class->mounted_on;
    $path_prefix =~ s{/+$}{};
    return "$path_prefix$ENDPOINT_LIBRARY";
}

1;

__END__


=pod

=head1 NAME

jQluster::PSGI - PSGI application object to interface with a jQluster server

=head1 SYNOPSIS

    use jQluster::PSGI;
    use Plack::Builder;
    
    jQluster::PSGI->config(
        library_dir => "./path/to/jqluster/library/dir",
        mounted_on => "/jqluster",
    );
    
    return builder {
        mount(jQluster::PSGI->mounted_app);
        mount '/' => sub {
            my $env = shift;
            my $jqluster_websocket_endpoint_url = jQluster::PSGI->url_websocket($env);
            my $jqluster_library_url = jQluster::PSGI->url_library($env);
    
            your_code_here;
        };
    };

=head1 DESCRIPTION

L<jQluster::PSGI> is a class that interfaces between L<PSGI> and L<jQluster::Server>.
For now, this module uses L<Amon2> to build a L<PSGI> application.

=head1 CLASS METHODS

=head2 jQluster::PSGI->config(%args)

Set configuration parameters for L<jQluster::PSGI>.

Fields in C<%args> are:

=over

=item C<library_dir> => STR (optional, default: ".")

A path to the directory where jQluster library JavaScript files are located.

=item C<mounted_on> => STR (optional, default: "/")

A request path on which L<jQluster::PSGI> application will be mounted.

=back

=head2 $psgi_app = jQluster::PSGI->to_app

Returns a L<PSGI> application object.

=head2 $mounted_on_str = jQluster::PSGI->mounted_on

Returns the C<mounted_on> attribute set by C<config()> method.

=head2 ($mounted_on_str, $psgi_app) = jQluster::PSGI->mounted_app

A short-hand of C<< (jQluster::PSGI->mounted_on, jQluster::PSGI->to_app) >>.
This is useful in L<Plack::Builder>'s C<builder()> blocks.

=head2 $url_str = jQluster::PSGI->url_websocket($env)

Returns a fully qualified URL string for the WebSocket endpoint of jQluster.
C<$env> is a L<PSGI> environment object.

=head2 $url_str = jQluster::PSGI->url_library()

Returns an absolute path to the jQluster JavaScript library file.


=head1 AUTHOR

Toshio Ito C<< <toshio9.ito [at] toshiba.co.jp> >>

=cut

