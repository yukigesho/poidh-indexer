const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

type FarcasterUser = {
  fid: number;
  username: string;
};

export async function getFarcasterUsers(
  addresses: string[]
): Promise<Record<string, FarcasterUser[]>> {
  try {
    if (!NEYNAR_API_KEY) {
      throw Error("Neynar key not found");
    }

    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addresses.join(
      ","
    )}`;
    const options = {
      method: "GET",
      headers: { "x-api-key": NEYNAR_API_KEY },
    };
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Neynar request failed with ${response.status}`);
    }
    const data = (await response.json()) as Record<string, FarcasterUser[]>;
    return data;
  } catch (error) {
    return {};
  }
}

export async function getDisplayName(address: string): Promise<string> {
  const users = await getFarcasterUsers([address.toLowerCase()]);
  const userArray = users[address.toLowerCase()];
  if (userArray && userArray[0]?.username) {
    return `@${userArray[0].username}`;
  }
  return address.slice(0, 7);
}

export async function sendNotification({
  title,
  messageBody,
  targetUrl,
  targetFIds = [],
}: {
  title: string;
  messageBody: string;
  targetUrl: string;
  targetFIds?: Array<number>;
}) {
  if (!NEYNAR_API_KEY) {
    throw Error("Neynar key not found");
  }

  const url = "https://api.neynar.com/v2/farcaster/frame/notifications/";

  const options = {
    method: "POST",
    headers: {
      "x-api-key": NEYNAR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_fids: targetFIds,
      notification: { title: title, body: messageBody, target_url: targetUrl },
    }),
  };

  let i = 3;
  while (i-- !== 0) {
    try {
      await (await fetch(url, options)).json();
      break;
    } catch (error) {
      console.error(error);
    }
  }
}
