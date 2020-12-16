import { envvar } from "@/lib/envvar"

export const getSlackEventTopicARN = async () => {
  return `arn:aws:sns:us-east-1:${await envvar.get('aws/account-id')}:slack-events`
}