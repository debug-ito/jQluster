#!/usr/bin/env perl

use strict;
use warnings;
use MultiReader::ItemStore;

my $storage = MultiReader::ItemStore->new(
    sqlite => 'feed_store.sqlite3',
);

foreach my $url (qw(http://rss.rssad.jp/rss/slashdot/slashdot.rss
                    http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml)) {
    warn "Loading $url\n";
    $storage->import_items(url => $url);
}

