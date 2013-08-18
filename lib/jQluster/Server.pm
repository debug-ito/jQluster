package jQluster::Server;
use strict;
use warnings;
use Carp;
use Data::UUID;

sub new {
    my ($class) = @_;
    my $self = bless {
        id_generator => Data::UUID->new,
        registry => {},
        uids_for_remote_id => {}
    }, $class;
    return $self;
}

sub _generate_message_id {
    my ($self) = @_;
    return $self->{id_generator}->create_str();
}

my @REG_KEYS = qw(unique_id remote_id message_id sender);

sub register {
    my ($self, %args) = @_;
    foreach my $key (@REG_KEYS) {
        croak "$key parameter is mandaotry" if not defined $args{$key};
    }
    my %reg_entry = ();
    @reg_entry{@REG_KEYS} = @args{@REG_KEYS};
    $self->{registry}{$reg_entry{unique_id}} = \%reg_entry;
    $self->{uids_for_remote_id}{$reg_entry{remote_id}}{$reg_entry{unique_id}} = 1;

    $self->distribute({
        message_id => $self->_generate_message_id(),
        message_type => "register_reply",
        from => undef, to => $args{remote_id},
        body => { error => undef, in_reply_to => $args{message_id} }
    });
}

sub unregister {
    my ($self, $unique_id) = @_;
    my $entry = delete $self->{registry}{$unique_id};
    return if !defined($entry);
    delete $self->{uids_for_remote_id}{$entry->{remote_id}}{$entry->{unique_id}};
}

sub distribute {
    my ($self, $message) = @_;
    my $to = $message->{to};
    return if !defined($to);
    my $uid_map = $self->{uids_for_remote_id}{$to};
    return if !defined($uid_map);
    my @entries = map { $self->{registry}{$_} } keys %$uid_map;
    foreach my $entry (@entries) {
        next if !defined($entry);
        $entry->{sender}->($message);
    }
}

1;

__END__

=head1 NAME

jQluster::Server - jQluster tranport server independent of underlying connection implementation

=head1 SYNOPSIS

    my $server = jQluster::Server->new();
    
    $server->register(
        unique_id => "global unique ID for the connection",
        remote_id => "remote ID for the connection",
        message_id => "regsitration message ID",
        sender => sub {
            my ($message) = @_;
            $some_transport->send($message);
        }
    );
    
    $server->distribute($message);
    
    $server->unregister($unique_id);

=head1 DESCRIPTION

L<jQluster::Server> accepts connections from jQluster nodes, receives
messages from these nodes and distributes the messages to appropriate
destination nodes.

L<jQluster::Server> is independent of connection implementations. It
just tells the destination connection's sender routine that it has
incoming messages to the connection.

=head1 METHODS

TBW. See the L</SYNOPSIS>.

=head1 AUTHOR

Toshio Ito C<< toshio9.ito [at] toshiba.co.jp >>







