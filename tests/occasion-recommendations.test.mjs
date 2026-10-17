import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendedDates} from '../admin/seasons/recommendations.mjs';

test('next suggestions follow South African moving occasions and roll past completed windows',()=>{
 const now='2026-10-17T12:00';
 const expected={easter:['2027-03-28','2027-03-14T08:00','2027-03-30T00:00'],mothers:['2027-05-09','2027-04-25T08:00','2027-05-10T00:00'],fathers:['2027-06-20','2027-06-06T08:00','2027-06-21T00:00']};
 for(const [id,[occasionDate,start,end]]of Object.entries(expected))assert.deepEqual([recommendedDates(id,now).occasionDate,recommendedDates(id,now).start,recommendedDates(id,now).end],[occasionDate,start,end]);
 assert.equal(recommendedDates('christmas',now).start,'2026-12-01T08:00');
 assert.equal(recommendedDates('christmas','2026-12-27T00:00').start,'2027-12-01T08:00');
 assert.equal(recommendedDates('valentine',now).start,'2027-02-01T08:00');
});
test('existing campaign year is respected, including leap years and cross-year windows',()=>{
 assert.equal(recommendedDates('easter','2026-10-17T12:00','2028-01-01T08:00').occasionDate,'2028-04-16');
 assert.equal(recommendedDates('mothers','2026-10-17T12:00','2026-01-01T08:00').occasionDate,'2026-05-10');
 assert.equal(recommendedDates('summer','2027-01-02T12:00').start,'2026-12-01T08:00');
 assert.equal(recommendedDates('halloween','2026-10-31T22:00').end,'2026-11-01T00:00');
});
test('unknown occasions and business anniversary never invent dates',()=>{
 assert.equal(recommendedDates('birthday','2026-10-17T12:00'),null);
 assert.equal(recommendedDates('custom-example','2026-10-17T12:00'),null);
});
