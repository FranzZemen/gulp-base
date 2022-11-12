import {inspect} from 'node:util';

export function helloWorld() {
  console.log('Hello World');
}


export class A {
  constructor() {
    console.log(inspect({hello:'world'}, false, 10, true));
  }
}
