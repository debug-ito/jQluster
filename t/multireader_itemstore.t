use strict;
use warnings;
use Test::More;

BEGIN {
    use_ok("MultiReader::ItemStore");
}

{
    my $storage = new_ok('MultiReader::ItemStore', [
        source => ['dbi:SQLite:dbname=:memory:', '', ''],
        count_per_page => 3
    ]);
    my @added_items = map {
        +{
            id => sprintf('http://hogehoge.com/item/%d', $_),
            created_at => sprintf('2013-10-12T%02d:10:02+0900', $_),
            title => "title $_",
            original_url => sprintf('http://hogehoge.com/%d', $_),
            body => "<p>hogehoge</p>",
        }
    } (0 .. 19);
    $storage->add_items(reverse @added_items);

    is($storage->get_item(id => "http://hogehoge.com/item/10")->{id}, "http://hogehoge.com/item/10", "get_item() existent item");
    is($storage->get_item(id => "unknown"), undef, "get_item() non-existent item");
    is_deeply([ map { $_->{id} } $storage->get_items(page => 0) ],
              [ map { "http://hogehoge.com/item/$_" } (19, 18, 17)],
              "get_items() first page");
    is_deeply([ map { $_->{id} } $storage->get_items(page => 2)],
              [ map { "http://hogehoge.com/item/$_" } (13, 12, 11) ],
              "get_items() third page");
    is_deeply([ map { $_->{id} } $storage->get_items(page => 100) ], [], "get_items() too large page");
}

done_testing;
