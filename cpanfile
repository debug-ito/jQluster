
requires "perl", "5.10.0";
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
requires "URI";
requires "XML::Feed";
requires "DateTime::Format::Strptime";
requires "HTML::Barcode::QRCode";

on test => sub {
    requires "Test::More";
};
