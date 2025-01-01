import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import {
  db,
  useGongoUserId,
  useGongoOne,
  useGongoIsPopulated,
} from "gongo-client-react";
import type { WithId } from "gongo-client/lib/browser/Collection";
// import addMonths from "date-fns/addMonths";
import addDays from "date-fns/addDays";
//import RevolutCheckout from "@revolut/checkout";

import {
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  // FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import Link from "../src/Link";
import type { User } from "../src/schemas";
import { DAILY_FREE_CREDITS, MIN_PAID_CREDITS } from "../src/config/constants";
import { signIn } from "next-auth/react";

function intOrFixedOneStr(num: number) {
  if (num && !Number.isInteger(num)) return num.toFixed(1);
  return num.toString();
}

export function creditsStrOrFalse(user: User | null) {
  if (!(user && user.credits)) return false;
  return intOrFixedOneStr(user.credits.free + user.credits.paid);
}

function RedeemCreditCode({ user }: { user: WithId<User> }) {
  const [creditCode, setCreditCode] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();
    setDisabled(true);
    const result = await db.call("redeemCreditCode", {
      creditCode: creditCode.toUpperCase(),
    });
    setDisabled(false);
    console.log(result);

    if (!result) return setMessage("Failed with unknown error.");

    if (result.$error) {
      if (result.$error === "NO_SUCH_CODE")
        return setMessage(t`No such code exists.`);
      if (result.$error === "MAXIMUM_REACHED")
        return setMessage(
          t`Code already redeeemed maximum number of times, sorry.`
        );
      if (result.$error === "ALREADY_REDEEMED")
        return setMessage(t`You have already redeemed this code before.`);
      if (typeof result.$error === "string") return setMessage(result.$error);
    }

    if (result.$success) {
      setTimeout(() => {
        // TODO, _update should allow mongo modifier
        // const users = db.collection("users");
        // const user = users.findOne({ _id });
        // if (!user) return;
        user.credits.free = user.credits.free + (result.credits as number);
        db.collection("users")._update(user._id, user);
      }, 100);

      /*
      db.collection("users").updateId(user._id, {
        $set: {
          "credits.free": user.credits.free + (result.credits as number),
        },
      });
      */

      return setMessage(t`Successfully redeemed ${result.credits} credits.`);
    }

    return setMessage("Failed with unknown error.");
  }

  return (
    <Box>
      <p>
        <Trans>Redeem Credit Code</Trans>
      </p>
      <form onSubmit={go}>
        <TextField
          size="small"
          value={creditCode}
          onChange={(e) => setCreditCode(e.target.value)}
        />{" "}
        <Button variant="contained" type="submit" disabled={disabled}>
          {disabled ? <Trans>Loading...</Trans> : <Trans>Redeem</Trans>}
        </Button>
        <br />
        {message && <Box sx={{ color: "red", mt: 1 }}>{message}</Box>}
      </form>
    </Box>
  );
}

export default function Credits() {
  const router = useRouter();
  const { redirect_status } = router.query;
  const isPopulated = useGongoIsPopulated();
  const userId = useGongoUserId() as string | null;
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const [loading, setLoading] = React.useState(false);
  const [numCredits, setNumCredits] = React.useState("100");

  if (!isPopulated) return <div>Loading...</div>;

  if (!userId) {
    signIn();
    return null;
  }

  if (!user) return <div>Loading...</div>;

  // const renewalDay = user.createdAt.getDate();
  // const nextCreditDate = addMonths(new Date(), 1);
  // nextCreditDate.setDate(renewalDay);
  const nextCreditDate = addDays(new Date(), 1);
  const userCredits = creditsStrOrFalse(user);

  async function buy(event: React.SyntheticEvent) {
    event.preventDefault();
    setLoading(true);

    // @ts-expect-error: TODO
    const auth = db.auth.authInfoToSend();
    const response = await fetch("/api/createStripePaymentIntent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auth, numCredits: parseInt(numCredits) }),
    });

    // clientSecret, orderId
    const json = await response.json();
    const params = new URLSearchParams(json);
    return router.push("/checkout?" + params.toString());
  }

  return (
    <>
      <MyAppBar title={t`My Credits`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        {redirect_status === "succeeded" && (
          <Box sx={{ color: "red", mb: 2 }}>
            <Trans>Purchase Successful!</Trans>
          </Box>
        )}
        <Typography variant="h6">
          <Trans>Total Credits</Trans>: {userCredits}
        </Typography>
        <Trans>Total credits available for immediate use.</Trans>
        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Free Credits</Trans>: {intOrFixedOneStr(user.credits.free)}
        </Typography>
        <Trans>
          Your <b>{DAILY_FREE_CREDITS}</b>
          <sup>*</sup> free credits are topped up every <b>day</b>
          <sup>*</sup>. They are used before your paid credits. Unused credits
          don&apos;t carry over.
        </Trans>{" "}
        <span style={{ fontStyle: "italic", fontSize: "80%" }}>
          <Trans>
            <sup>*</sup>May change at any time.
          </Trans>
        </span>
        <p>
          <Trans>Next credits on:</Trans>{" "}
          <b>{nextCreditDate.toLocaleDateString()}</b>
          <br />
        </p>
        <RedeemCreditCode user={user} />
        <p>
          <Trans>
            Earn free credits by contributing to the project on GitHub!
          </Trans>
        </p>
        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Purchased Credits</Trans>:{" "}
          {intOrFixedOneStr(user.credits.paid)}
        </Typography>
        <Trans>
          Purchased credits are used after you run out of free credits that
          month, and don&apos;t expire.
        </Trans>{" "}
        <Trans>Paid credits help you jump the queue!</Trans>
        <Box sx={{ my: 2 }}>
          <details>
            <summary>
              <Trans>Tell me more?</Trans>
            </summary>
            <Trans>There are 3 queue priorites, served in this order:</Trans>
            <ul>
              <li>
                <b>1st Class</b>: <Trans>those using paid credits.</Trans>
              </li>
              <li>
                <Trans>
                  <b>2nd Class</b>: using free credits but have a balance of at
                  least {MIN_PAID_CREDITS} paid credits.
                </Trans>
              </li>
              <li>
                <b>3rd Class</b>:{" "}
                <Trans>
                  those using free credits, and have {MIN_PAID_CREDITS} or less
                  paid credits.
                </Trans>
              </li>
            </ul>
            <Trans>So, just owning {MIN_PAID_CREDITS} paid credits </Trans>
          </details>
        </Box>
        <Box>
          <form>
            <FormControl>
              {/* <FormLabel id="credit-amount-label">Gender</FormLabel> */}
              <RadioGroup
                aria-labelledby="credit-amount-label"
                value={numCredits}
                onChange={(event) => setNumCredits(event.target.value)}
                name="credit-amount-group"
              >
                <FormControlLabel
                  value="100"
                  control={<Radio />}
                  label="100 for USD 3.00 (3c / credit)"
                />
                <FormControlLabel
                  value="500"
                  control={<Radio />}
                  label="500 for USD 10.00 (2c / credit) - save 33.3%"
                />
                <FormControlLabel
                  value="1000"
                  control={<Radio />}
                  label="1000 for USD 15.00 (1.5c / credit) - save 50%"
                />
              </RadioGroup>
            </FormControl>
            <br />
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={buy}
              disabled={loading}
            >
              {loading ? (
                <Trans>Please wait...</Trans>
              ) : (
                <Trans>Checkout</Trans>
              )}
            </Button>
          </form>
        </Box>
        <Box sx={{ my: 2, fontSize: "80%" }}>
          <Trans>
            The charge will appear from &quot;Wastelands Networking&quot; or
            &quot;KIRI.ART&quot;.
          </Trans>
        </Box>
        <Box sx={{ my: 2 }}>
          <Trans>
            This project is community run by volunteers in our spare time. We
            make no guarantees, and refunds are not possible at this time.
          </Trans>
        </Box>
        <Button component={Link} variant="outlined" href="/orders">
          <Trans>Order History</Trans>
        </Button>
        <Box sx={{ fontSize: "80%", py: 2 }}>
          <Trans>
            Reminder: this is Free and Open Source Software. You can run your
            own copy for free on your own PC, with either a suitable graphics
            card or a cheap Banana.Dev acccount. More info on the{" "}
            <Link href="/about">About Page</Link>.
          </Trans>
        </Box>
      </Container>
    </>
  );
}
