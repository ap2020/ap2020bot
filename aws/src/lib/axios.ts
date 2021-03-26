import axiosLib from 'axios';

export const axios = axiosLib.create({
  headers: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'User-Agent': 'https://github.com/ap2020/ap2020bot',
  },
});
