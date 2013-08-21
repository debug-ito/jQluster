
requires "Carp";
requires "Data::UUID";
requires "Plack";
requires "Plack::App::File";
requires "FindBin";
requires "Amon2::Lite";

on test => sub {
    requires "Test::More";
};
