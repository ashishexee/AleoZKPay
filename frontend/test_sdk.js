import { PrivateKey, ViewKey, Record } from '@provablehq/sdk';

try {
    const pk = new PrivateKey();
    const vk = ViewKey.from_private_key(pk);
    console.log("ViewKey structure:", Object.getOwnPropertyNames(Object.getPrototypeOf(vk)));
    console.log("Record structure:", Object.getOwnPropertyNames(Record));
    console.log("Record prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(new Record("record123..."))).join(', '));
} catch(e) { console.error(e); }
