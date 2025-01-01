import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId } from "gongo-client-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import CheckoutForm from "../src/CheckoutForm";
import { signIn } from "next-auth/react";

import { Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

let stripePromise: Promise<Stripe | null>;
const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
      throw new Error("process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY not set");
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

export default function Checkout() {
  const router = useRouter();
  const { clientSecret, orderId, numCredits, costInUSD } = router.query;
  const userId = useGongoUserId();
  /*
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  */

  if (typeof clientSecret !== "string" || typeof orderId !== "string") {
    if (
      Object.keys(router.query).length === 0 &&
      typeof location === "object" &&
      location.href.match(/clientSecret/)
    )
      return <div>Loading...</div>;

    throw new Error(
      "either clientSecret or orderId query param is not a string"
    );
  }

  if (!userId) {
    signIn();
    return null;
  }

  if (!clientSecret) return <div>Loading...</div>;

  const options = {
    // passing the client secret obtained from the server
    clientSecret,
    loader: "auto" as const,
  };

  return (
    <>
      <MyAppBar title={t`Checkout`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Checkout</Trans>
        </Typography>

        <p>
          <Trans>{numCredits} credits</Trans>
        </p>

        <p>
          <b>
            <Trans>TOTAL</Trans>: <Trans>USD</Trans> $
            {typeof costInUSD === "string" && parseFloat(costInUSD).toFixed(2)}
          </b>
        </p>

        <p>
          <i>
            <Trans>Secure Payment via Stripe.com and partners.</Trans>
          </i>
        </p>

        <Elements stripe={getStripe()} options={options}>
          <CheckoutForm orderId={orderId} />
        </Elements>
      </Container>
    </>
  );
}
