import test from 'node:test';
import assert from 'node:assert/strict';
import {millis,localTime} from '../src/seasons/time.mjs';

test('SAST minute timestamps retain real calendar dates across the supported four-digit years',()=>{
 for(const [value,expected] of [
  ['0000-01-01T00:00',-62167226400000],
  ['1900-12-25T00:00',-2178064800000],
  ['2000-02-29T12:30',951820200000],
  ['2028-02-29T12:30',1835433000000],
  ['9999-12-31T23:59',253402293540000],
 ]){
  assert.equal(millis(value),expected,value);
  assert.equal(localTime(expected),value,value);
 }
});

test('SAST parsing rejects rollover dates, invalid times and alternate timestamp syntax',()=>{
 for(const value of [
  null,undefined,0,'','2026-02-29T12:00','1900-02-29T12:00','2028-02-30T12:00',
  '2026-00-25T12:00','2026-13-25T12:00','2026-12-00T12:00','2026-12-32T12:00',
  '2026-12-25T24:00','2026-12-25T12:60','2026-12-25T12:00Z',
  '2026-12-25T12:00+02:00','2026-12-25T12:00:00','2026-12-25',
  '2026-12-25T12:00\n','2026-12-25T12:00\0','10000-01-01T00:00',
 ])assert.equal(Number.isNaN(millis(value)),true,String(value));
 for(const value of [NaN,Infinity,-Infinity,undefined,'0'])assert.equal(localTime(value),'');
});
