import { axios } from '@/lib/axios';

export const reply = async (
  /* eslint-disable @typescript-eslint/naming-convention */
  { response_url, text, ephemeral = true }: { response_url: string; text: string; ephemeral?: boolean },
  /* eslint-enable @typescript-eslint/naming-convention */

): Promise<void> => {
  await axios.post(
    response_url,
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      text,
      response_type: ephemeral ? 'ephemeral' : 'in_channel',
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  );
};
