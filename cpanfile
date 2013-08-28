
requires "Carp";
requires "Data::UUID";
requires "Plack";
requires "Plack::App::File";
requires "FindBin";
requires "Amon2::Lite";
requires "Protocol::WebSocket";
requires "Twiggy";
requires "JavaScript::Value::Escape";
requires "JSON";
requires "Scalar::Util";

on test => sub {
    requires "Test::More";
};
