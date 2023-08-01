import React from "react";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Clear, Redo, Undo, Circle, FormatPaint } from "@mui/icons-material";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import OutputImage from "../src/OutputImage";
import Controls, { randomizeSeedIfChecked } from "../src/sd/Controls";
import Footer from "../src/sd/Footer";
import { toast } from "react-toastify";
import FloodFill from "q-floodfill";
// import { Trans } from "@lingui/macro";
import sharedInputTextFromInputs from "./lib/sharedInputTextFromInputs";
import blobToBase64 from "./lib/blobToBase64";
import sendQueue, { outputImageQueue } from "./lib/sendQueue";
import fetchToOutput from "./lib/fetchToOutput";

// Border around inImg{Canvas,Mask}, useful in dev
// const DRAW_BORDERS = false;

const brushes = { small: 20, medium: 35, large: 50 };

const hexColor = {
  black: "#000000",
  gray: "#c0c0c0",
  white: "#ffffff",
  red: "#ff0000",
  orange: "#ffa500",
  yellow: "#ffff00",
  green: "#008000",
  purple: "#800080",
  sienna: "#a0522d",
  aqua: "#00ffff",
  blue: "#0000ff",
};

const colors = Object.keys(hexColor);

interface Op {
  drawState: DrawState;
  steps: [number, number][];
}

function Canvas({
  initImageCanvasRef,
  imageRef,
  drawState,
  setOpsCount,
  setOpsIndex,
  ctxRef,
  ops,
  opsIndexRef,
}: {
  // file: File | null;
  initImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  drawState: React.MutableRefObject<DrawState>;
  setOpsCount: React.Dispatch<React.SetStateAction<number>>;
  setOpsIndex: React.Dispatch<React.SetStateAction<number>>;
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  ops: React.MutableRefObject<Op[]>;
  opsIndexRef: React.MutableRefObject<number>;
}) {
  const isDrawing = React.useRef(false);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    console.log("Canvas useEffect");
    const canvas = initImageCanvasRef.current;
    if (!canvas) throw new Error("no canvas ref");

    const initImageCanvas = initImageCanvasRef.current;
    if (!initImageCanvas) throw new Error("No initImageCanvas");

    // console.log({ file });
    // if (file) return;
    // console.log("init");

    if (imageRef.current) {
      // move logic to here?  currently we do it in imgload handler
    } else {
      canvas.width = 512;
      canvas.height = 512;
    }

    //canvas.width = initImageCanvas.width;
    //canvas.height = initImageCanvas.height;

    const ctx = (ctxRef.current = canvas.getContext("2d"));
    if (!ctx) throw new Error("Couldn't get new 2d context");

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    function mouseDown(event: MouseEvent | TouchEvent) {
      if (!canvas) throw new Error("no canvas");

      const ds = drawState.current;

      isDrawing.current = true;
      if (!ctx) throw new Error("no context");

      ctx.strokeStyle = ds.color;
      if (ds.brush !== "fill") ctx.lineWidth = brushes[ds.brush];

      //setDrawing(true);
      console.log({
        opsIndexRef: opsIndexRef.current,
        opsLength: ops.current.length,
      });

      if (opsIndexRef.current === ops.current.length) {
        ops.current.push({ drawState: ds, steps: [] });
      } else {
        ops.current.splice(
          opsIndexRef.current,
          ops.current.length - opsIndexRef.current,
          { drawState: ds, steps: [] }
        );
      }

      if (ds.brush === "fill") {
        const tEvent = event instanceof TouchEvent ? event.touches[0] : event;

        const mouse = {
          x: Math.round(
            (tEvent.pageX - canvas.offsetLeft) *
              (canvas.width / canvas.clientWidth)
          ),
          y: Math.round(
            (tEvent.pageY - canvas.offsetTop) *
              (canvas.height / canvas.clientHeight)
          ),
        };

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const floodFill = new FloodFill(imgData);
        floodFill.fill(hexColor[ds.color], mouse.x, mouse.y, 0);
        ctx.putImageData(floodFill.imageData, 0, 0);
        ops.current[ops.current.length - 1].steps.push([mouse.x, mouse.y]);
      }
      setOpsCount(ops.current.length);
      setOpsIndex((opsIndexRef.current = ops.current.length));
    }

    function mouseUp(_event: MouseEvent | TouchEvent) {
      isDrawing.current = false;
      // setDrawing(false);
      lastRef.current = null;
    }

    function mouseMove(event: MouseEvent | TouchEvent) {
      const canvas = initImageCanvasRef.current;
      const ctx = ctxRef.current;
      if (!isDrawing.current || !ctx || !canvas) return;

      // disable scroll if we're drawing (i.e. no file)
      // if (!file) event.preventDefault();
      // console.log(1);

      const tEvent = window.TouchEvent
        ? event instanceof TouchEvent
          ? event.touches[0]
          : event
        : (event as MouseEvent);

      const mouse = {
        x:
          (tEvent.pageX - canvas.offsetLeft) *
          (canvas.width / canvas.clientWidth),
        y:
          (tEvent.pageY - canvas.offsetTop) *
          (canvas.height / canvas.clientHeight),
      };

      const last = lastRef.current;
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.closePath();
        ctx.stroke();
      }
      lastRef.current = { x: mouse.x, y: mouse.y };

      const op = ops.current[ops.current.length - 1];
      const lastDraw = op.steps[op.steps.length - 1];
      if (last && !(lastDraw[0] === last.x && lastDraw[1] === last.y))
        op.steps.push([last.x, last.y]);
      op.steps.push([mouse.x, mouse.y]);
    }

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("touchstart", mouseDown, { passive: false });
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("touchmove", mouseMove, { passive: false });
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("touchend", mouseUp, { passive: false });
    return () => {
      // ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.removeEventListener("mousedown", mouseDown);
      canvas.removeEventListener("touchstart", mouseDown);
      canvas.removeEventListener("mousemove", mouseMove);
      canvas.removeEventListener("touchmove", mouseMove);
      canvas.removeEventListener("mousedown", mouseUp);
      canvas.removeEventListener("touchend", mouseUp);
    };
  }, [
    initImageCanvasRef,
    imageRef,
    ctxRef,
    drawState,
    ops,
    opsIndexRef,
    setOpsCount,
    setOpsIndex,
    /*, file */
    ,
  ]);
  return (
    <div
      style={{
        maxWidth: 512,
        // maxHeight: 512,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <canvas
        id="initImageCanvas"
        style={{
          // position: "absolute",
          // top: 0,
          // left: 0,
          // disable scroll if we're drawing (i.e. no file)
          touchAction: "none", // file ? undefined : "none",
          // border: DRAW_BORDERS ? "1px solid red" : undefined,
          // Canvas is cropped image size, browser will scale to fill window
          width: "100%",
          maxWidth: 512,
          // maxHeight: 512,
          aspectRatio: "1",
          border: "1px solid black",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        ref={initImageCanvasRef}
      />
    </div>
  );
}

interface DrawState {
  color: keyof typeof hexColor;
  brush: "small" | "medium" | "large" | "fill";
}

function Paint({
  // file,
  initImageCanvasRef,
  imageRef,
}: {
  // file: File | null;
  initImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
}) {
  //const [drawing, setDrawing] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const ops = React.useRef<Op[]>([]);
  const opsIndexRef = React.useRef(0);

  const [color, setColor] = React.useState<DrawState["color"]>("black");
  const [brush, setBrush] = React.useState<DrawState["brush"]>("medium");

  const drawState = React.useRef({ brush, color });
  React.useEffect(() => {
    drawState.current = { brush, color };
  }, [brush, color]);

  /*
   * [
   *   [ [x,y], [x,y], [x,y], ... ]  // op #0
   * ]
   */
  const [opsCount, setOpsCount] = React.useState(0);
  const [opsIndex, setOpsIndex] = React.useState(0);
  // console.log({ opsIndex, opsCount });

  function redraw() {
    const canvas = initImageCanvasRef.current;
    const ctx = ctxRef.current;
    if (!(canvas && ctx)) throw new Error("canvas or ctx not defined");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < opsIndexRef.current; i++) {
      const op = ops.current[i];
      if (op.drawState.brush === "fill") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const floodFill = new FloodFill(imgData);
        floodFill.fill(
          hexColor[op.drawState.color],
          op.steps[0][0],
          op.steps[0][1],
          0
        );
        ctx.putImageData(floodFill.imageData, 0, 0);
        continue;
      }

      ctx.lineWidth = brushes[op.drawState.brush];
      ctx.strokeStyle = op.drawState.color;
      const steps = op.steps;
      for (let j = 1; j < steps.length; j++) {
        ctx.beginPath();
        ctx.moveTo(steps[j - 1][0], steps[j - 1][1]);
        ctx.lineTo(steps[j][0], steps[j][1]);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  function clearOps() {
    ops.current = [];
    setOpsIndex((opsIndexRef.current = 0));
    setOpsCount(0);
    redraw();
  }
  function undoOp() {
    setOpsIndex(--opsIndexRef.current);
    redraw();
  }
  function redoOp() {
    setOpsIndex(++opsIndexRef.current);
    redraw();
  }

  return (
    <>
      <Canvas
        initImageCanvasRef={initImageCanvasRef}
        imageRef={imageRef}
        drawState={drawState}
        setOpsCount={setOpsCount}
        setOpsIndex={setOpsIndex}
        ctxRef={ctxRef}
        ops={ops}
        opsIndexRef={opsIndexRef}
      />
      {
        /*!file &&*/ <div style={{ textAlign: "center" }}>
          <IconButton onClick={clearOps}>
            <Clear />
          </IconButton>
          <IconButton disabled={opsIndex === 0} onClick={undoOp}>
            <Undo />
          </IconButton>
          <IconButton disabled={opsIndex === opsCount} onClick={redoOp}>
            <Redo />
          </IconButton>
          <ToggleButtonGroup
            value={brush}
            onChange={(_event, value) => setBrush(value)}
            exclusive
            aria-label="color"
          >
            <ToggleButton value="small">
              <Circle sx={{ fontSize: "40%" }} />
            </ToggleButton>
            <ToggleButton value="medium">
              {" "}
              <Circle sx={{ fontSize: "70%" }} />
            </ToggleButton>
            <ToggleButton value="large">
              {" "}
              <Circle sx={{ fontSize: "100%" }} />
            </ToggleButton>
            <ToggleButton value="fill">
              <FormatPaint sx={{ fontSize: "120%" }} />
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            sx={{
              position: "relative",
              top: 0,
              left: 10,
            }}
            value={color}
            onChange={(_event, value) => setColor(value)}
            exclusive
            aria-label="color"
          >
            {colors.map((color) => (
              <ToggleButton
                sx={{
                  background: color,
                  color: color,
                  fontSize: "5%",
                  "&:hover": {
                    background: color,
                  },
                  "&.MuiToggleButton-root.Mui-selected": {
                    background: color,
                    color: "black",
                  },
                }}
                key={color}
                value={color}
                aria-label={color}
              >
                X
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      }
    </>
  );
}

const inpaintState = [
  "prompt",
  "MODEL_ID",
  "PROVIDER_ID",
  "negative_prompt",
  "strength",
  "num_inference_steps",
  "guidance_scale",
  "seed",
  "randomizeSeed",
  "shareInputs",
  "safety_checker",
  "sampler",
];

export default function Img2img() {
  const inputFile = React.useRef<HTMLInputElement>(null);
  const initImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  // const [initImageLoaded, setInImgLoaded] = React.useState(false);
  // const [file, setFile] = React.useState<File | null>(null);
  // const fileIsLoading = React.useRef(false);

  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [nsfw, setNsfw] = React.useState(false);
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const [requestStartTime, setRequestStartTime] = React.useState<number | null>(
    null
  );
  const [requestEndTime, setRequestEndTime] = React.useState<number | null>(
    null
  );
  const [historyId, setHistoryId] = React.useState("");

  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(inpaintState);
  const sharedInputs = sharedInputTextFromInputs(inputs);

  function readFile(file: File) {
    const fileReader = new FileReader();
    // fileIsLoading.current = true;
    fileReader.onload = function (readerEvent) {
      //event.target.result
      // const result = event.target.result;
      //const result = fileReader.result;

      console.log("initImage loaded from disk");
      const image = (imageRef.current = new Image());
      image.onload = function (_imageEvent) {
        console.log("initImage loaded to image");
        const canvas = initImageCanvasRef.current;
        if (!canvas) throw new Error("no canvas");

        // Later we could get fancy and clip around just the mask at send time.
        let width, height;
        // const SD_MAX = [1024, 768]; // can also be 768x1024
        const SD_MAX = [1024, 1024];

        if (image.width >= image.height && image.width > SD_MAX[0]) {
          width = SD_MAX[0];
          height = Math.floor((image.height / image.width) * SD_MAX[0]);
          if (height > SD_MAX[1]) height = SD_MAX[1];
        } else if (image.height > image.width && image.height > SD_MAX[0]) {
          height = SD_MAX[0];
          width = Math.floor((image.width / image.height) * SD_MAX[0]);
          if (width > SD_MAX[1]) width = SD_MAX[1];
        } else {
          width = image.width;
          height = image.height;
        }

        console.log(`Original Image: ${image.width}x${image.height}`);
        console.log(`  Scaled Image: ${width}x${height}`);

        const aspectRatio = width / height;

        // Must be a multple of 64.  Scale for now, crop in future.
        if (width % 64 !== 0) {
          width = width - (width % 64);
          height = Math.floor(width / aspectRatio);
          if (height % 64 !== 0) height -= height % 64;
        } else if (height % 64 !== 0) {
          height = height - (height % 64);
          width = Math.floor(height * aspectRatio);
          if (width % 64 !== 0) width -= width % 64;
        }
        console.log(`   Fixed Image: ${width}x${height}`);

        //const parent = canvas.parentNode as HTMLDivElement;
        canvas.style.aspectRatio = aspectRatio.toString();

        canvas.width = width;
        canvas.height = height;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d" /*, { alpha: false } */);
        if (!ctx) throw new Error("no 2d contxt from canvas");

        ctx.drawImage(image, 0, 0, width, height);
        //setInImgLoaded(true);
        //setFile(file);
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
      // fileIsLoading.current = false;
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
    if (!file.type.match(/^image\//)) return toast("Not an image");

    setImgSrc("");

    readFile(file);
  }

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // TODO, record state in URL, e.g. #prompt=,etc
      if (!user) return router.push("/login?from=/inpaint");
      if (!(user.credits.free > 0 || user.credits.paid > 0))
        return router.push("/credits");
    }

    // setLog(["[WebUI] Executing..."]);
    setImgSrc("/img/placeholder.png");

    if (!initImageCanvasRef.current)
      throw new Error("initImageCanvasRef.current not set");

    const init_image_blob = (await new Promise(
      (resolve) =>
        initImageCanvasRef.current &&
        initImageCanvasRef.current.toBlob(
          (blob: Blob | null) => resolve(blob),
          "image/jpeg"
        )
    )) as Blob | null;

    if (!init_image_blob) {
      console.log("no init image blob");
      return;
    }

    const modelInputs = {
      ...modelStateValues(inputs),
      // prompt: inputs.prompt.value || randomPrompt,
      image: await blobToBase64(init_image_blob),
      strength: inputs.strength.value,
      seed: randomizeSeedIfChecked(inputs),
    };

    const callInputs = {
      PIPELINE: "AutoPipelineForImage2Image",
      // PIPELINE: "lpw_stable_diffusion",
      // custom_pipeline_method: "img2img",
      // @ts-expect-error: TODO
      SCHEDULER: modelInputs.sampler,
    };

    // return console.log(data);

    setRequestStartTime(Date.now());
    setRequestEndTime(null);

    await fetchToOutput("dda", modelInputs, callInputs, {
      setLog,
      setImgSrc,
      setNsfw,
      setHistoryId,
    });

    setRequestEndTime(Date.now());
  }

  React.useEffect(() => {
    if (sendQueue.has()) {
      const share = sendQueue.get();
      console.log(share);
      if (!share) return;
      readFile(share.files[0]);
    }
  }, []);

  React.useEffect(() => {
    if (outputImageQueue.has()) {
      const share = outputImageQueue.get();
      console.log(share);
      if (!share) return;

      // share.files[0]
      const reader = new FileReader();
      reader.onload = () =>
        reader.result && setImgSrc(reader.result.toString());
      reader.readAsDataURL(share.files[0]);
    }
  }, []);

  return (
    <>
      <Paint initImageCanvasRef={initImageCanvasRef} imageRef={imageRef} />
      <div style={{ textAlign: "center" }}>
        <input type="file" ref={inputFile} onChange={fileChange}></input>
      </div>
      {imgSrc && (
        <OutputImage
          text={sharedInputs}
          imgSrc={imgSrc}
          nsfw={nsfw}
          log={log}
          requestStartTime={requestStartTime}
          requestEndTime={requestEndTime}
          historyId={historyId}
        />
      )}

      <Controls
        go={go}
        inputs={inputs}
        uiState={uiState}
        requestStartTime={requestStartTime}
        requestEndTime={requestEndTime}
      />
      <Footer />
    </>
  );
}
