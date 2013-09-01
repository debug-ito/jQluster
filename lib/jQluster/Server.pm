package jQluster::Server;
use 5.10.0;
use strict;
use warnings;
use Carp;
use Data::UUID;

sub new {
    my ($class, %args) = @_;
    my $self = bless {
        id_generator => Data::UUID->new,
        registry => {},
        uids_for_remote_id => {},
        logger => $args{logger} // sub {
            warn(__PACKAGE__ . ": $_[0]: $_[1]\n");
        }
    }, $class;
    return $self;
}

sub _generate_message_id {
    my ($self) = @_;
    return $self->{id_generator}->create_str();
}

sub _log {
    my ($self, $level, $msg) = @_;
    $self->{logger}->($level, $msg);
}

sub register {
    my ($self, %args) = @_;
    foreach my $key (qw(unique_id message sender)) {
        croak "$key parameter is mandatory" if not defined $args{$key};
    }
    foreach my $msg_key (qw(message_id from message_type)) {
        if(!defined($args{message}{$msg_key})) {
            croak "The register message does not have $msg_key field. Something is wrong.";
        }
    }
    if($args{message}{message_type} ne "register") {
        croak "Message type is $args{message}{message_type}, not 'register'. Something is wrong.";
    }
    my %reg_entry = (
        unique_id => $args{unique_id},
        sender => $args{sender},
        remote_id => $args{message}{from}
    );
    $self->{registry}{$reg_entry{unique_id}} = \%reg_entry;
    $self->{uids_for_remote_id}{$reg_entry{remote_id}}{$reg_entry{unique_id}} = 1;
    $self->_log(info => "Accept registration: unique_id = $reg_entry{unique_id}, remote_id = $reg_entry{remote_id}");

    $self->distribute({
        message_id => $self->_generate_message_id(),
        message_type => "register_reply",
        from => undef, to => $reg_entry{remote_id},
        body => { error => undef, in_reply_to => $args{message}{message_id} }
    });
}

sub unregister {
    my ($self, $unique_id) = @_;
    my $entry = delete $self->{registry}{$unique_id};
    return if !defined($entry);
    delete $self->{uids_for_remote_id}{$entry->{remote_id}}{$entry->{unique_id}};
    $self->_log(info => "Unregister: unique_id = $unique_id, remote_id = $entry->{remote_id}");
}

my %REPLY_MESSAGE_TYPE_FOR = (
    select_and_get => "select_and_get_reply",
    select_and_listen => "select_and_listen_reply"
);

sub _try_reply_error_to {
    my ($self, $orig_message, $error) = @_;
    my $reply_message_type = $REPLY_MESSAGE_TYPE_FOR{$orig_message->{message_type}};
    if(!defined($reply_message_type)) {
        $self->_log("error", "Unknown message type: $orig_message->{message_type}: cannot reply to it.");
        return;
    }
    $self->distribute({
        message_id => $self->_generate_message_id(),
        message_type => $reply_message_type,
        from => undef, to => $orig_message->{from},
        body => { error => $error, in_reply_to => $orig_message->{message_id} }
    });
}

sub distribute {
    my ($self, $message) = @_;
    my $to = $message->{to};
    if(!defined($to)) {
        return;
    }
    my $uid_map = $self->{uids_for_remote_id}{$to};
    if(!defined($uid_map) || !%$uid_map) {
        $self->_try_reply_error_to($message, "Target remote node ($to) does not exist.");
        return;
    }
    foreach my $uid (keys %$uid_map) {
        my $entry = $self->{registry}{$uid};
        if(!defined($entry)) {
            $self->_log("error", "UID registry has a key for $uid, but it does not map to an entry object. Something is wrong.");
            next;
        }
        $entry->{sender}->($message);
    }
}

1;

__END__

=head1 NAME

jQluster::Server - jQluster tranport server independent of underlying connection implementation

=head1 SYNOPSIS

    my @logs = ();
    my $server = jQluster::Server->new(
        logger => sub {  ## OPTIONAL
            my ($level, $msg) = @_;
            push(@logs, [$level, $msg]);
        }
    );
    
    $server->register(
        unique_id => "global unique ID for the connection",
        message => $registration_message,
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

