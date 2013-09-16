package MultiReader::ItemStore;
use 5.10.0;
use strict;
use warnings;
use Data::Validator;
use DBI;
use SQL::Maker;
use Try::Tiny;
use Carp;
use URI;
use XML::Feed;
use DateTime::Format::Strptime;

sub new {
    state $validator = Data::Validator->new(
        sqlite => { isa => 'Str' },
        count_per_page => { isa => 'Int', default => 100 },
    )->with("Method", "Croak");
    my ($class, $args) = $validator->validate(@_);
    if($args->{count_per_page} <= 0) {
        croak "count_per_page parameter must be > 0";
    }
    my $self = bless {
        dbh => undef,
        sqlite_source => $args->{sqlite},
        count_per_page => $args->{count_per_page},
        maker => undef,
    }, $class;
    $self->_init_maker();
    $self->_create_tables();
    return $self;
}

sub _init_maker {
    my ($self) = @_;
    $self->{maker} = SQL::Maker->new(driver => "SQLite");
}

sub _get_dbh {
    my ($self) = @_;
    if(!defined($self->{dbh})) {
        $self->{dbh} = DBI->connect("dbi:SQLite:dbname=$self->{sqlite_source}", "", "", {
            RaiseError => 1, PrintError => 0, AutoCommit => 1,
            FetchHashKeyName => "NAME_lc", sqlite_unicode => 1,
        });
    }
    return $self->{dbh};
}

sub _create_tables {
    my ($self) = @_;
    my $dbh = $self->_get_dbh();
    $dbh->do(<<SQL);
CREATE TABLE IF NOT EXISTS feed_items (
    id TEXT NOT NULL PRIMARY KEY ON CONFLICT IGNORE,
    created_at TEXT NOT NULL,
    title TEXT NOT NULL,
    original_url TEXT NOT NULL,
    body TEXT NOT NULL
)
SQL
    $dbh->do(<<SQL);
CREATE INDEX IF NOT EXISTS feed_items_created_at ON feed_items (
    created_at DESC
)
SQL
}

sub add_items {
    my ($self, @items) = @_;
    my $dbh = $self->_get_dbh();
    try {
        $dbh->begin_work();
        my $sth;
        foreach my $item (@items) {
            my ($sql, @bind) = $self->{maker}->insert("feed_items", $item);
            if(!$sth) {
                $sth = $dbh->prepare($sql);
            }
            $sth->execute(@bind);
        }
        $dbh->commit();
    }catch {
        my $e = shift;
        $dbh->rollback();
        die $e;
    };
}

sub get_items {
    state $dv = Data::Validator->new(
        page => { isa => "Int", default => 0 },
    )->with('Method', 'Croak');
    my ($self, $args) = $dv->validate(@_);
    if($args->{page} < 0) {
        croak "page parameter must be >= 0";
    }
    my %options = (
        offset => $args->{page} * $self->{count_per_page},
        limit => $self->{count_per_page},
        order_by => "created_at DESC",
    );
    my ($sql, @bind) = $self->{maker}->select('feed_items', ['*'], {}, \%options);
    my $dbh = $self->_get_dbh();
    return @{ $dbh->selectall_arrayref($sql, { Slice => {} }, @bind) };
}

sub get_item {
    state $dv = Data::Validator->new(
        id => { isa => "Str" }
    )->with('Method', 'Croak');
    my ($self, $args) = $dv->validate(@_);
    my ($sql, @bind) = $self->{maker}->select(
        'feed_items', ['*'], { id => $args->{id} }
    );
    my $dbh = $self->_get_dbh();
    return $dbh->selectrow_hashref($sql, {}, @bind);
}

my $DATETIME_FORMAT = DateTime::Format::Strptime->new(
    pattern => '%Y-%m-%dT%H:%M:%S%z'
);

sub format_datetime {
    my ($class_self, $datetime) = @_;
    return $DATETIME_FORMAT->format_datetime($datetime);
}

sub import_items {
    my ($self, %args) = @_;
    my $feed_source;
    if(defined($args{data})) {
        $feed_source = \($args{data});
    }elsif(defined($args{file})) {
        $feed_source = $args{file};
    }elsif(defined($args{url})) {
        $feed_source = URI->new($args{url});
    }else {
        croak "Either data, file or url parameter is mandatory";
    }
    my $feed = XML::Feed->parse($feed_source);
    my @converted_items = ();
    foreach my $entry ($feed->entries) {
        my $created_at = $entry->modified || $entry->issued;
        push(@converted_items, {
            id => $entry->id,
            created_at => ref($self)->format_datetime($created_at),
            original_url => $entry->link,
            title => $entry->title,
            body => $entry->content->body
        });
    }
    $self->add_items(@converted_items);
}


1;

__END__

=pod

=head1 NAME

MultiReader::ItemStore - storage for feed items

=head1 SYNOPSIS

    my $storage = MultiReader::ItemStore->new(
        sqlite => 'hoge.sqlite3',
        count_per_page => 50,
    );
    
    my @items = $storage->get_items(page => 2);
    
    my $item = $storage->get_item(id => 'http://example.com/item/123456');
    
    $storage->add_items({
        id => 'http://example.com/item/456789',
        created_at => '2013-08-11T11:00:14+0900',
        title => "hoge",
        original_url => "http://example.com/show/456789",
        body => '<p>hogehoge</p>',
    });
    
    $storage->import_items(data => $feed_xml_string);
    $storage->import_items(file => $feed_xml_filename);
    $storage->import_items(url  => $feed_xml_url_string);

=head1 DESCRIPTION

L<MultiReader::ItemStore> is a simple storage object for feed items.
Individual feed items are plain hash-refs.

=head1 METHODS

TBW. See the SYNOPSIS.

=head1 AUTHOR

Toshio Ito C<< <toshio9.ito [at] toshiba.co.jp> >>


=cut


