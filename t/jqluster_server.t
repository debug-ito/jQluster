use strict;
use warnings;
use Test::More;

BEGIN {
    use_ok("jQluster::Server");
}

sub create_fake_connection {
    my @log = ();
    return {
        log => \@log,
        sender => sub {
            push(@log, shift);
        }
    };
}

sub clear_log {
    foreach my $connection (@_) {
        @{$connection->{log}} = ();
    }
}

{
    note("--- registration");
    my $s = new_ok("jQluster::Server");
    my $alice = create_fake_connection();
    $s->register(
        unique_id => 1, remote_id => "alice",
        message_id => "hoge", sender => $alice->{sender}
    );
    is(scalar(@{$alice->{log}}), 1, "1 message received after registration");
    my $msg = $alice->{log}[0];
    is_deeply($msg, {
        message_id => $msg->{message_id}, ## arbitrary
        message_type => "register_reply", from => undef, to => "alice",
        body => { error => undef, in_reply_to => "hoge" }
    });
}

{
    note("--- single destination");
    my $s = jQluster::Server->new();
    my $alice = create_fake_connection();
    my $bob = create_fake_connection();
    $s->register(
        unique_id => "$alice", remote_id => "alice",
        message_id => "alice_register", sender => $alice->{sender}
    );
    $s->register(
        unique_id => "$bob", remote_id => "bob",
        message_id => "bob_register", sender => $bob->{sender}
    );
    clear_log $alice, $bob;
    my $message = {
        message_id => "test", message_type => "test",
        from => "alice", to => "bob", body => { foo => "bar" }
    };
    $s->distribute($message);
    is_deeply($alice->{log}, [], "alice recieves nothing");
    is_deeply($bob->{log}, [$message], "bob receives a message");
}

{
    note("--- multiple destination");
    my $s = jQluster::Server->new();
    my @connections = map { create_fake_connection() } 1..2;
    foreach my $c (@connections) {
        $s->register(
            unique_id => "$c", remote_id => "carol",
            message_id => "$c", sender => $c->{sender}
        );
    }
    clear_log @connections;
    my $message = {
        message_id => "test", message_type => "test",
        from => "alice", to => "carol", body => {hoge => 100}
    };
    $s->distribute($message);
    foreach my $i (0 .. $#connections) {
        my $c = $connections[$i];
        is_deeply($c->{log}, [$message], "connection $i received the message");
    }
}

{
    note("--- unregister (single node in remote_id)");
    my $s = jQluster::Server->new();
    my $alice = create_fake_connection();
    $s->register(
        unique_id => "$alice", remote_id => "alice", message_id => "hoge",
        sender => $alice->{sender}
    );
    my $bob = create_fake_connection();
    $s->register(
        unique_id => "$bob", remote_id => "bob", message_id => "foobar",
        sender => $bob->{sender}
    );
    clear_log $alice, $bob;
    $s->unregister("$alice");
    $s->distribute({
        message_id => "buzz", message_type => "test",
        from => "bob", to => "alice", body => {error => undef}
    });
    is_deeply($alice->{log}, [], "alice receives nothing because it is unregistered");
    is_deeply($bob->{log}, [], "bob receives nothing, of course");
}

{
    note("--- unregister (multiple nodes in remote_id)");
    my $s = jQluster::Server->new();
    my @cs = map { create_fake_connection() } 1..2;
    foreach my $c (@cs) {
        $s->register(
            unique_id => "$c", remote_id => "carol", message_id => "$c",
            sender => $c->{sender}
        );
    }
    clear_log @cs;
    $s->unregister("$cs[0]");
    my $message = {
        message_id => "hoge", message_type => "test",
        from => "bob", to => "carol", body => {error => undef}
    };
    $s->distribute($message);
    is_deeply($cs[0]{log}, [], "connection 0 receives nothing because it is already unregistered");
    is_deeply($cs[1]{log}, [$message], "connection 1 receives the message because it is still registered");
}

done_testing();

