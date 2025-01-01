import React from "react";
import { t, Trans } from "@lingui/macro";
import {
  useGongoSub,
  useGongoUserId,
  useGongoIsPopulated,
  useGongoLive,
} from "gongo-client-react";

import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import Link from "../src/Link";
import { signIn } from "next-auth/react";

export default function Orders() {
  useGongoSub("orders", {});
  const isPopulated = useGongoIsPopulated();
  const userId = useGongoUserId();
  const orders = useGongoLive((db) =>
    db.collection("orders").find().sort("createdAt", "desc")
  );
  if (!isPopulated) return <div>Loading...</div>;

  if (!userId) {
    signIn();
    return null;
  }

  console.log(orders);

  return (
    <>
      <MyAppBar title={t`Order Status`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Orders</Trans>
        </Typography>

        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Link href={"/order/" + order._id}>
                      {order.createdAt.toLocaleDateString()}
                    </Link>
                  </TableCell>
                  <TableCell align="right">{order.numCredits || 50}</TableCell>
                  <TableCell align="right">
                    $ {(order.amount / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>{order.stripePaymentIntentStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}
