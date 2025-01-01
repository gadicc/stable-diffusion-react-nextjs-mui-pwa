import { Trans, Plural } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { Box, Button, Container } from "@mui/material";

import { /* isDev, */ REQUIRE_REGISTRATION } from "./lib/client-env";
import { signIn } from "next-auth/react";

export default function GoButton({
  disabled,
  // _dest,
  // _setDest,
  credits,
}: {
  disabled: boolean;
  // _dest: string;
  // _setDest: React.Dispatch<React.SetStateAction<string>>;
  credits: number;
}) {
  const router = useRouter();
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  const userCredits = (user?.credits?.free || 0) + (user?.credits?.paid || 0);
  const enoughCredits = userCredits && userCredits > credits;

  // TODO: what about form submit?  could hackily store state in an
  // attribute and check before submit maybe *shrug*
  // TODO, also remove old logic in all the pages (txt2img, inpaint, etc)
  function maybeRouteSomewhere(event: React.SyntheticEvent) {
    if (REQUIRE_REGISTRATION) {
      if (!user) {
        event.preventDefault();
        return signIn();
      }
      if (!enoughCredits) {
        event.preventDefault();
        return router.push("/credits");
      }
    }
  }

  return (
    <Container
      sx={{
        position: "sticky",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 10%, rgba(255,255,255,1) 100%)",
        textAlign: "center",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 100,
        px: 0,
        pt: 1,
      }}
    >
      <Button
        variant="contained"
        fullWidth
        sx={{ my: 1 }}
        type="submit"
        disabled={disabled}
        onClick={maybeRouteSomewhere}
      >
        {(function () {
          if (!REQUIRE_REGISTRATION) return <Trans>Go</Trans>;
          if (!user) return <Trans>Login</Trans>;
          if (!enoughCredits) return <Trans>Get More Credits</Trans>;
          return <Plural value={credits} one="# Credit" other="# Credits" />;
        })()}
      </Button>
      {REQUIRE_REGISTRATION && user && (
        <Box
          sx={{
            fontSize: "70%",
            color: "#aaa",
            textAlign: "center",
            mt: -0.5,
            mb: 1,
          }}
        >
          <Plural
            value={userCredits}
            one="# credit remaining"
            other="# credits remaining"
          />
        </Box>
      )}
    </Container>
  );
}
