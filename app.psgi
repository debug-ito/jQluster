use 5.10.0;
use strict;
use warnings;
use Amon2::Lite;
use jQluster::PSGI;
use Plack::Builder;
use JavaScript::Value::Escape;
use MultiReader::ItemStore;
use FindBin;
use Try::Tiny;
use HTML::Barcode::QRCode;

my $FEED_DB = "$FindBin::RealBin/feed_store.sqlite3";

__PACKAGE__->template_options(
    function => {
        js => \&javascript_value_escape,
        jqluster_library => sub { jQluster::PSGI->url_library },
    }
);

jQluster::PSGI->config(
    library_dir => "$FindBin::RealBin/js",
    mounted_on => "/jqluster"
);

my $feed_items = MultiReader::ItemStore->new(
    sqlite => $FEED_DB, count_per_page => 5
);

sub get_qrcode {
    my ($env) = @_;
    state $cached;
    return $cached if defined $cached;
    my $hostport = $env->{HTTP_HOST} // "$env->{SERVER_NAME}:$env->{SERVER_PORT}";
    return $cached = HTML::Barcode::QRCode->new(
        text => $env->{'psgi.url_scheme'}."://$hostport/headlines.html",
        module_size => '15px',
        css_class => "qrcode-headlines",
    )->render;
}

my $handler_display = sub {
    my ($c) = @_;
    return $c->render('display.tt', {
        qrcode => get_qrcode($c->req->env)
    });
};

get $_ => $handler_display foreach '/', '/index.html';

foreach my $page_name (qw(headlines single)) {
    get "/$page_name.html" => sub {
        my ($c) = @_;
        return try {
            return $c->render("$page_name.tt");
        }catch {
            return $c->res_404;
        };
    };
}

get "/component_headlines.html" => sub {
    my ($c) = @_;
    return try {
        my $page = $c->req->query_parameters->{page} // 0;
        my @items = $feed_items->get_items(page => $page);
        return $c->render("component_headlines.tt", {
            items => \@items
        });
    }catch {
        return $c->res_404;
    };
};


get "/body.html" => sub {
    my ($c) = @_;
    return try {
        my $id = $c->req->query_parameters->{id};
        die "id param is mandatory" if not defined $id;
        my $item = $feed_items->get_item(id => $id);
        die "No item found" if not defined $item;
        return $c->render("body.tt", { item => $item });
    }catch {
        my $e = shift;
        return $c->create_response(
            404, ['Content-Type' => 'text/plain; charset=UTF-8'],
            ["Not Found: $e"]
        );
    };
};



foreach my $js_name (qw(display headlines)) {
    my $template_name = "$js_name.js.tt";
    get "/$js_name.js" => sub {
        my ($c) = @_;
        my $res = $c->render($template_name, {
            transport_id => $c->req->query_parameters->{loopback}
                    ? "loopback"
                    : jQluster::PSGI->url_websocket($c->req->env),
        });
        $res->content_type("application/javascript");
        return $res;
    };
}

return builder {
    mount(jQluster::PSGI->mounted_app);
    mount "/" => __PACKAGE__->to_app(handle_static => 1);
};
