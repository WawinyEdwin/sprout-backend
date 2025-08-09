import { IState } from './integration.types';

export const getEncodedState = (state: string) => {
  console.log("state", state)
  const decoded = JSON.parse(
    Buffer.from(state, 'base64').toString('utf-8'),
  ) as IState;
  return decoded;
};
