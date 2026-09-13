import {test} from 'node:test';import assert from 'node:assert/strict';import {previewCsv} from '../src/csv.ts';
test('quoted CSV preview and six-row limit',()=>{assert.deepEqual(previewCsv('a,b\r\n"one,two","three"\r\n'),[['a','b'],['one,two','three']]);assert.equal(previewCsv('a\n1\n2\n3\n4\n5\n6').length,6)});
