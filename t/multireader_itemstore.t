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

    $storage->add_items({
        id => 'http://hogehoge.com/item/10',
        created_at => '2013-03-12T21:30:00+0900',
        title => 'overwritten',
        original_url => "",
        body => "",
    });
    is($storage->get_item(id => 'http://hogehoge.com/item/10')->{title}, 'title 10', 'adding an item with an existent ID is just ignored.');
}

{
    my $storage = MultiReader::ItemStore->new(source => ['dbi:SQLite:dbname=:memory:', '', '']);
    $storage->import_items(file => "./t/sample_feed.xml");
    my $item = $storage->get_item(id => 'http://www.feedforall.com/schools.htm');
    is($item->{id}, 'http://www.feedforall.com/schools.htm', 'id ok');
    is($item->{original_url}, 'http://www.feedforall.com/schools.htm', 'original_url ok');
    is($item->{created_at}, '2004-10-19T11:09:09-0400', 'created_at ok');
    is($item->{title}, 'RSS Solutions for Schools and Colleges', 'title ok');
}

done_testing;
