import { nanoid } from 'nanoid';

export const makeId = (prefix) => `${prefix}_${nanoid(8)}`;
