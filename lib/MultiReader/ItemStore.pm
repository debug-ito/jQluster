package MultiReader::ItemStore;
use 5.10.0;
use strict;
use warnings;
use Data::Validator;
use DBI;
use SQL::Maker;
use Try::Tiny;
use Carp;

sub new {
    state $validator = Data::Validator->new(
        source => { isa => 'ArrayRef' },
        count_per_page => { isa => 'Int', default => 100 },
    )->with("Method", "Croak");
    my ($class, $args) = $validator->validate(@_);
    if($args->{count_per_page} <= 0) {
        croak "count_per_page parameter must be > 0";
    }
    my $self = bless {
        dbh => undef,
        source => $args->{source},
        count_per_page => $args->{count_per_page},
        maker => undef,
    }, $class;
    $self->_init_maker();
    $self->_create_tables();
    return $self;
}

sub _init_maker {
    my ($self) = @_;
    if($self->{source}[0] !~ /^dbi:([^:]+):/) {
        croak "Invalid DSN: " . $self->{source}[0];
    }
    my $driver = $1;
    $self->{maker} = SQL::Maker->new(driver => $driver);
}

sub _get_dbh {
    my ($self) = @_;
    if(!defined($self->{dbh})) {
        $self->{dbh} = DBI->connect(@{$self->{source}}, {
            RaiseError => 1, PrintError => 0, AutoCommit => 1,
            FetchHashKeyName => "NAME_lc",
        });
    }
    return $self->{dbh};
}

sub _create_tables {
    my ($self) = @_;
    my $dbh = $self->_get_dbh();
    $dbh->do(<<SQL);
CREATE TABLE IF NOT EXISTS feed_items (
    id TEXT NOT NULL PRIMARY KEY,
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

1;

__END__

=pod

=head1 NAME

MultiReader::ItemStore - storage for feed items

=head1 SYNOPSIS

    my $storage = MultiReader::ItemStore->new(
        source => ['dbi:SQLite:dbname=hoge.sqlite3', '', ''],
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

=head1 DESCRIPTION

L<MultiReader::ItemStore> is a simple storage object for feed items.
Individual feed items are plain hash-refs.

=head1 METHODS

TBW. See the SYNOPSIS.

=head1 AUTHOR

Toshio Ito C<< <toshio9.ito [at] toshiba.co.jp> >>


=cut


