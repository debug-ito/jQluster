use strict;
use warnings;
use Amon2::Lite;
use Plack::App::File;
use FindBin;
use Plack::Builder;

my $JQLUSTER_DIR = "$FindBin::RealBin/js";

my @JQLUSTER_FILES = qw(util.js
                        connection.js
                        connection_websocket.js
                        transport.js
                        remote_selector.js
                        remote_selector_factory.js
                        jquery_adaptor.js
                   );

get '/' => sub {
    my ($c) = @_;
    return $c->render('index.tt');
};

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
 
return builder {
    mount "/lib" => Plack::App::File->new(root => "$FindBin::RealBin/js/lib")->to_app;
    mount "/" => __PACKAGE__->to_app();
};


