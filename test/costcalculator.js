process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();

const CostCalculator = require("../libs/costcalculator");

describe('Calculate Cost', () => {
    
    describe("Book Meeting Room",  () => {
        it("it should calcuate cost for meeting room for 30m", async (done) => {
            try {
                let result = await CostCalculator("5bd7283ebfc02163c7b4d5d7", new Date("2020-01-01T09:00:00"), new Date("2020-01-01T09:30:00"));
                result.should.equal(2.8);
                done();
            } catch(err) {
                done(err);
            }
        });
    });
});