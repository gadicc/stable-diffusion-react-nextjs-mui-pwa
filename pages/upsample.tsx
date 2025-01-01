import React, { useMemo } from "react";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";
// import bananaFetch from "../src/bananaFetch";
import {
  upsampleCallInputsSchema,
  upsampleModelInputsSchema,
} from "../src/schemas";
import { signIn } from "next-auth/react";

import {
  Box,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
} from "@mui/material";
import { HelpOutline } from "@mui/icons-material";

import { /* isDev, */ REQUIRE_REGISTRATION } from "../src/lib/client-env";
import MyAppBar from "../src/MyAppBar";
import defaults from "../src/sd/defaults";
import { toast } from "react-toastify";
import OutputImage from "../src/OutputImage";
import GoButton from "../src/GoButton";
import blobToBase64 from "../src/lib/blobToBase64";
import sendQueue from "../src/lib/sendQueue";
import fetchToOutput from "../src/lib/fetchToOutput";
import { ProviderSelect } from "../src/sd/Controls";
import calculateCredits from "../src/calculateCredits";

const maxSizeText = "3.2MB";

function ModelMenuItem({ value, desc }: { value: string; desc: string }) {
  return (
    <Box sx={{ textAlign: "center", width: "100%" }}>
      <div style={{ fontWeight: "bold" }}>{value}</div>
      <div>{desc}</div>
    </Box>
  );
}

function ModelSelect({
  value,
  setValue,
  defaultValue,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  defaultValue: typeof defaults.MODEL_ID;
}) {
  return useMemo(
    () => (
      <FormControl fullWidth>
        <InputLabel id="model-select-label">
          <Trans>Model</Trans>
        </InputLabel>
        <Select
          id="model-select"
          label={t`Model`}
          labelId="model-select-label"
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => setValue(event.target.value)}
          size="small"
        >
          {/* Unfortunately <Select /> relies on having direct <MenuItem /> children */}
          <MenuItem
            value="RealESRGAN_x4plus"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="RealESRGAN_x4plus"
              desc={t`Original model, best for most cases.`}
            />
          </MenuItem>

          <MenuItem
            value="RealESRGAN_x4plus_anime_6B"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="RealESRGAN_x4plus_anime_6B"
              desc={t`Best for Anime`}
            />
          </MenuItem>

          <MenuItem
            value="realesr-general-x4v3"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="realesr-general-x4v3"
              desc={t`General - v3`}
            />
          </MenuItem>
        </Select>
      </FormControl>
    ),
    [value, setValue, defaultValue]
  );
}

function FaceEnhance({
  value,
  setValue,
  disabled,
}: {
  value: boolean;
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  disabled: boolean;
}) {
  return React.useMemo(() => {
    return (
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Stack
          direction="row"
          spacing={0}
          justifyContent="center"
          alignItems="center"
        >
          <FormGroup sx={{ alignItems: "center" }}>
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  checked={value}
                  onChange={(event) => setValue(event.target.checked)}
                  disabled={disabled}
                />
              }
              label={
                <Box>
                  <Trans>Face Enhance</Trans>
                </Box>
              }
            />
          </FormGroup>
          <Tooltip
            title={
              <Box>
                <Trans>
                  Face Restoration. Good for photorealistic images, bad for
                  anime.
                </Trans>
              </Box>
            }
            enterDelay={0}
            enterTouchDelay={0}
            leaveDelay={0}
            leaveTouchDelay={3000}
          >
            <HelpOutline
              sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
            />
          </Tooltip>
        </Stack>
      </Grid>
    );
  }, [value, setValue, disabled]);
}

export default function Upsample() {
  const inputImage = React.useRef<HTMLImageElement>(null);
  const [modelId, setModelId] = React.useState("RealESRGAN_x4plus");
  const [faceEnhance, setFaceEnhance] = React.useState(true);
  const [PROVIDER_ID, setPROVIDER_ID] = React.useState("kiri");
  const [validImageLoaded, setValidImageLoaded] = React.useState(false);
  const [invalidImageReason, setInvalidImageReason] = React.useState("");

  const [imgSrc, setImgSrc] = React.useState("");
  const [log, setLog] = React.useState([] as Array<string>);
  /*
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  */
  const [requestStartTime, setRequestStartTime] = React.useState<number | null>(
    null
  );
  const [requestEndTime, setRequestEndTime] = React.useState<number | null>(
    null
  );
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  const CREDIT_COST = calculateCredits(
    { MODEL_ID: modelId, use_extra: "upsample" },
    {}
  );

  React.useEffect(() => {
    if (sendQueue.has()) {
      const share = sendQueue.get();
      console.log(share);
      if (!share) return;
      setValidImageLoaded(true);
      setInvalidImageReason("");

      readFile(share.files[0]);
      toast(t`Image Loaded`);
    }
  }, []);

  React.useEffect(() => {
    if (faceEnhance && modelId.match(/anime/) !== null) setFaceEnhance(false);
  }, [modelId, faceEnhance]);

  function readFile(file: File) {
    const fileReader = new FileReader();
    fileReader.onload = function (readerEvent) {
      console.log("inputImage loaded from disk");
      // const image = new Image();
      const image = inputImage.current;
      if (!image) throw new Error("no inputImage.current");
      image.onload = function (_imageEvent) {
        console.log("inputImage loaded to image");
        // const aspectRatio = image.width / image.height;
        const parentNode = image.parentNode as HTMLDivElement;
        if (parentNode)
          parentNode.style["aspectRatio"] = `${image.width} / ${image.height}`;
      };

      if (!readerEvent) throw new Error("no readerEevent");
      if (!readerEvent.target) throw new Error("no readerEevent.target");

      const result = readerEvent.target.result;
      const sample = "data:image/jpeg;base64,/9j/4Ty6RXhpZgA....FyyDbU//2Q==";
      if (typeof result !== "string")
        throw new Error(
          `readerEvent.target.result is not a string, expected "${sample}" but got: ` +
            JSON.stringify(result)
        );

      image.src = result;
    };
    fileReader.readAsDataURL(file);
  }

  function fileChange(event: React.SyntheticEvent) {
    const target = event.target as HTMLInputElement;
    if (!(target instanceof HTMLInputElement))
      throw new Error("Event target is not an HTMLInputElement");

    // @ts-expect-error: I can't be any clearer, typescript
    const file = target.files[0];

    console.log(file);
    if (!file.type.match(/^image\//)) {
      setValidImageLoaded(false);
      setInvalidImageReason(t`File is not a valid image.`);
      return;
    }

    if (file.size > 3.2 * 1024 * 1024) {
      setValidImageLoaded(false);
      setInvalidImageReason(t`File is too large; ${maxSizeText} max.`);
      return;
    }

    setValidImageLoaded(true);
    setInvalidImageReason("");

    setImgSrc("");
    readFile(file);
  }

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // [TODO, record state in URL, e.g. #prompt=,etc]  maybe working now with signIn?
      if (!user) return signIn();
      if (!(user.credits.free > CREDIT_COST || user.credits.paid > CREDIT_COST))
        return router.push("/credits");
    }

    if (!inputImage.current) throw new Error("no inputImage.current");
    const input_image_blob = await fetch(inputImage.current.src).then((res) =>
      res.blob()
    );

    if (!input_image_blob) {
      console.log("no init image blob");
      return;
    }

    const modelInputs = upsampleModelInputsSchema.cast({
      input_image: await blobToBase64(input_image_blob),
      face_enhance: faceEnhance,
    });
    const callInputs = upsampleCallInputsSchema.cast({ MODEL_ID: modelId });

    // setLog(["[WebUI] Executing..."]);
    setImgSrc("/img/placeholder.png");

    setRequestStartTime(Date.now());
    setRequestEndTime(null);

    await fetchToOutput(
      PROVIDER_ID === "banana" ? "upsample" : "dda",
      modelInputs,
      {
        // PROVIDER_ID: "banana",
        PROVIDER_ID,
        use_extra: "upsample",
        ...callInputs,
      },
      {
        setLog,
        setImgSrc,
        // dest,
        // @ts-expect-error: TODO, db auth type
        auth: db.auth.authInfoToSend(),
        MODEL_NAME: "UPSAMPLE",
        setNsfw: () => {
          /* */
        },
        setHistoryId: () => {
          /* */
        },
      }
    );

    setRequestEndTime(Date.now());
  }

  return (
    <>
      <MyAppBar title={t`Upsampling`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        {/*
        <p style={{ textAlign: "center" }}>
          UNDER ACTIVE DEVELOPMENT
          <br />
          Credit cost may fluctuate during current high use.
          <br />
          It should be back to 0.2 again, and much faster, in a few more days.
        </p>
        */}
        <Box
          sx={{
            border: "1px solid black",
            width: "100%",
            maxWidth: 512,
            maxHeight: 512,
            aspectRatio: "1",
            marginLeft: "auto",
            marginRight: "auto",
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="input image"
            ref={inputImage}
            src="/img/placeholder.png"
            style={{ width: "100%", position: "absolute" }}
          ></img>
        </Box>
        <div style={{ textAlign: "center" }}>
          <input type="file" onChange={fileChange}></input>
          {invalidImageReason ? (
            <div style={{ color: "red" }}>{invalidImageReason}</div>
          ) : validImageLoaded ? null : (
            <div
              style={{ fontSize: "80%" }}
            >{t`Images should be max ${maxSizeText}.`}</div>
          )}
        </div>
        {imgSrc && (
          <OutputImage
            text={"file + upsampled"}
            imgSrc={imgSrc}
            nsfw={false}
            log={log}
            requestStartTime={requestStartTime}
            requestEndTime={requestEndTime}
          />
        )}
        <form onSubmit={go}>
          <Container sx={{ py: 1, textAlign: "center" }}>
            <ProviderSelect value={PROVIDER_ID} setValue={setPROVIDER_ID} />
          </Container>
          <ModelSelect
            value={modelId}
            setValue={setModelId}
            defaultValue="RealESRGAN_x4plus"
          />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <FaceEnhance
              value={faceEnhance}
              setValue={setFaceEnhance}
              disabled={modelId.match(/anime/) !== null}
            />
          </Grid>
          <GoButton
            disabled={!validImageLoaded}
            // dest={dest}
            // setDest={setDest}
            credits={CREDIT_COST}
          />
        </form>
      </Container>
    </>
  );
}
