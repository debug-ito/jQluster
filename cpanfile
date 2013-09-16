
requires "perl" => "5.10.0";
requires "Carp";
requires "Data::UUID";
requires "Plack";
requires "Plack::App::File";
requires "FindBin";
requires "Amon2";
requires "Amon2::Lite";
requires "Protocol::WebSocket";
requires "Twiggy";
requires "JavaScript::Value::Escape";
requires "JSON";
requires "Scalar::Util";
requires "Try::Tiny";
requires "Data::Validator";
requires "DBI";
requires "DBD::SQLite";
requires "SQL::Maker";

on test => sub {
    requires "Test::More";
};
