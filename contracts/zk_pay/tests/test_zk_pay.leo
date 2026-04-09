program test_zk_pay.aleo {
    @noupgrade
    constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    @test fn test_merchant_field_conversion() {
        let merchant: address = aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
        let expected_merchant_field: field =
            947113542301545363857217716479361902320907642358148838248532178752253004327field;

        assert_eq(merchant as field, expected_merchant_field);
    }

    @test fn test_amount_field_conversion() {
        let amount: u64 = 1000000u64;
        assert_eq(amount as field, 1000000field);
    }

    @test fn main_test() {
        assert(true);
    }
}
