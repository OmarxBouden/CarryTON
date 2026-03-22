import "@stdlib/deploy";

message FundEscrow {
    carrier: Address;
    deadline: Int as uint32;
}

message ConfirmDelivery {}
message ConfirmReceipt {}
message Refund {}

contract CarryTonEscrow with Deployable {
    owner: Address;              // protocol wallet — receives fees
    requester: Address;
    carrier: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    carrierConfirmed: Bool;
    requesterConfirmed: Bool;
    released: Bool;
    protocolFeeBps: Int as uint16;  // 500 = 5%

    init(owner: Address) {
        self.owner = owner;
        self.requester = newAddress(0, 0);
        self.carrier = newAddress(0, 0);
        self.amount = 0;
        self.deadline = 0;
        self.carrierConfirmed = false;
        self.requesterConfirmed = false;
        self.released = false;
        self.protocolFeeBps = 500;
    }

    receive(msg: FundEscrow) {
        require(self.amount == 0, "Already funded");
        require(context().value > 0, "Must send TON");
        self.requester = sender();
        self.carrier = msg.carrier;
        self.amount = context().value;
        self.deadline = msg.deadline;
    }

    receive(msg: ConfirmDelivery) {
        require(sender() == self.carrier, "Only carrier can confirm delivery");
        require(!self.released, "Already released");
        self.carrierConfirmed = true;
        if (self.carrierConfirmed && self.requesterConfirmed) {
            self.release();
        }
    }

    receive(msg: ConfirmReceipt) {
        require(sender() == self.requester, "Only requester can confirm receipt");
        require(!self.released, "Already released");
        self.requesterConfirmed = true;
        if (self.carrierConfirmed && self.requesterConfirmed) {
            self.release();
        }
    }

    receive(msg: Refund) {
        require(sender() == self.requester, "Only requester can request refund");
        require(!self.released, "Already released");
        require(now() > self.deadline, "Deadline not passed yet");
        self.released = true;
        send(SendParameters{
            to: self.requester,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            body: "Refund".asComment()
        });
    }

    fun release() {
        self.released = true;
        let fee: Int = self.amount * self.protocolFeeBps / 10000;
        let payout: Int = self.amount - fee;

        send(SendParameters{
            to: self.carrier,
            value: payout,
            mode: 0,
            body: "CarryTON payment".asComment()
        });

        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            body: "Protocol fee".asComment()
        });
    }

    get fun state(): String {
        if (self.released) { return "released"; }
        if (self.amount > 0) { return "funded"; }
        return "empty";
    }

    get fun escrowAmount(): Int {
        return self.amount;
    }

    get fun escrowDeadline(): Int {
        return self.deadline;
    }

    get fun isReleased(): Bool {
        return self.released;
    }
}
