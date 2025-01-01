import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import {
  useGongoSub,
  useGongoUserId,
  useGongoOne,
  useGongoIsPopulated,
} from "gongo-client-react";

import { Button, Container, Typography } from "@mui/material";

import MyAppBar from "../../src/MyAppBar";
import Link from "../../src/Link";
import { signIn } from "next-auth/react";

export default function OrderId() {
  const router = useRouter();
  const { _id, redirect_status } = router.query;
  const userId = useGongoUserId();
  const isPopulated = useGongoIsPopulated();

  /*
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  */

  // useGongoSub("order", { orderId: _id });
  useGongoSub("orders", {});

  const order = useGongoOne((db) => db.collection("orders").find({ _id }));

  if (redirect_status == "succeeded") {
    router.push("/credits?redirect_status=succeeded");
    return null;
  }

  if (!isPopulated) return <div>Loading...</div>;

  if (!userId) {
    signIn();
    return null;
  }

  if (!order) return <div>Loading...</div>;

  return (
    <>
      <MyAppBar title={t`Order Status`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Order {_id}</Trans>
        </Typography>
        <p>
          <Trans>Date</Trans>: {order.createdAt.toLocaleString()}
        </p>
        <p>
          <Trans>Amount</Trans>: {order.amount / 100}
        </p>
        <p>
          <Trans>Currency</Trans>: {order.currency}
        </p>
        <p>
          <Trans>Credits</Trans>: {order.numCredits || 50}
        </p>
        <p>
          <Trans>Status</Trans>: {order.stripePaymentIntentStatus}
        </p>
        {order.stripePaymentFailedReason && (
          <p>
            <Trans>Reason</Trans>: {order.stripePaymentFailedReason}
          </p>
        )}
        <Button variant="contained" component={Link} href="/credits">
          <Trans>Back to Credits</Trans>
        </Button>{" "}
        <Button variant="outlined" component={Link} href="/orders">
          <Trans>Order History</Trans>
        </Button>
      </Container>
    </>
  );
}
