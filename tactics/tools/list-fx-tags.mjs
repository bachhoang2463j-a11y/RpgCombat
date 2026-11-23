import { getFxTagOptions } from '../src/fx-library.mjs';

console.log(getFxTagOptions().map(({ name }) => name).join('、'));
