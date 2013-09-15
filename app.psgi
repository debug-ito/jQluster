use strict;
use warnings;
use Amon2::Lite;
use jQluster::PSGI;
use Plack::Builder;
use JavaScript::Value::Escape;
use FindBin;

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

get "/index.html" => sub {
    
};

get "/headlines.html" => sub {
    
};

get "/body.html" => sub {
    
};

return builder {
    mount(jQluster::PSGI->mounted_app);
    mount "/" => __PACKAGE__->to_app(handle_static => 1);
};
