import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import { t } from "@lingui/macro";
import {
  db,
  useGongoSub,
  useGongoLive,
  useGongoUserId,
} from "gongo-client-react";
// import { format } from "date-fns";

import {
  Box,
  Button,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import type { CSend, PayloadInitStart } from "../src/schemas/csend";
import { BananaRequest } from "../src/schemas";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

const MAX_TIME_TOTAL = 60000;
const MAX_TIME_LOAD = 10000;
const MAX_TIME_INIT = 10000;
const MAX_TIME_INFERENCE = 10000;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Chip({ type: _type, children }: { type: string; children: string }) {
  return (
    <div
      style={{
        display: "inline-block",
        borderRadius: 5,
        padding: "5px 10px 5px 10px",
        background: "#ddd",
        marginRight: 2,
        marginTop: 2,
        marginBottom: 2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function ByContainerRow({
  csends,
  info = {},
  marginBottom = 30,
  startRequestId,
}: {
  csends: CSend[];
  info: Partial<PayloadInitStart>;
  marginBottom?: number;
  startRequestId?: string;
}) {
  return (
    <div style={{ marginBottom: marginBottom }}>
      <div style={{ marginBottom: 10, maxWidth: "100%" }}>
        <Chip type="model_id">{info.model_id || "(model))"}</Chip>{" "}
        <Chip type="device">{info.device || "(device)"}</Chip>{" "}
        <Chip type="hostname">{info.hostname || "(hostname)"}</Chip>
      </div>
      <div>
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            {/*
              <TableHead>
                <TableRow>
                  <TableCell align="left" width={120}>
                    Date
                  </TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="right">TSL (ms)</TableCell>
                </TableRow>
              </TableHead>
            */}
            <TableBody>
              {csends.map((csend) => {
                const bold =
                  csends.length > 2 &&
                  // @ts-expect-error: TODO
                  csend?.payload?.startRequestId === startRequestId;
                return (
                  <TableRow
                    key={csend._id}
                    sx={{
                      "& td": {
                        fontWeight: bold ? "bold" : "",
                      },
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell align="left">
                      {csend.date.toLocaleTimeString()}
                    </TableCell>
                    <TableCell align="center">{csend.type}</TableCell>
                    <TableCell align="right">
                      {nf.format(csend.tsl)} ms
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

/*
function ByContainer({ csends }: { csends: CSend[] }) {
  const [byContainer, initInfo] = React.useMemo(() => {
    const byContainer: Record<string, CSend[]> = {};
    const initInfo: Record<string, PayloadInitStart> = {};

    for (const csend of csends) {
      const cid = csend.container_id;
      const container = byContainer[cid] || (byContainer[cid] = []);
      if (csend.status === "done") container.unshift(csend);

      if (csend.type === "init" && csend.status === "start")
        initInfo[cid] = csend.payload as PayloadInitStart;
    }
    return [byContainer, initInfo];
  }, [csends]);

  return (
    <div>
      {Object.entries(byContainer).map(([cid, entries]) => (
        <ByContainerRow key={cid} csends={entries} info={initInfo[cid]} />
      ))}
    </div>
  );
}
*/

function _ContainerEvents({ csends }: { csends: CSend[] }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="left" width={120}>
              Date
            </TableCell>
            <TableCell align="center">Type</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right">TSL (ms)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {csends.map((csend) => (
            <React.Fragment key={csend._id}>
              <TableRow
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell align="left">
                  {csend.date.toLocaleTimeString()}
                </TableCell>
                <TableCell align="center">{csend.type}</TableCell>
                <TableCell align="center">{csend.status}</TableCell>
                <TableCell align="right">{csend.tsl}</TableCell>
              </TableRow>
              {csend.type === "init" && csend.status === "start" ? (
                <TableRow
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell></TableCell>
                  <TableCell align="center">{csend.payload.device}</TableCell>
                  <TableCell align="center">{csend.payload.model_id}</TableCell>
                  <TableCell align="right">{csend.payload.hostname}</TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function RequestRowContainer({ request }: { request: BananaRequest }) {
  const CSends = db.collection("csends");
  const inferStart = CSends.findOne({
    // Can be useful to switch these during dev
    "payload.startRequestId": request.startRequestId,
    // "payload.startRequestId": null,
  });
  const containerId = inferStart && inferStart.container_id;

  if (!containerId) return <div>Could not find container info</div>;

  let initStart: CSend | undefined;

  const csends = CSends.find({ container_id: containerId })
    .toArraySync()
    .filter((csend) => {
      if (csend.type === "init" && csend.status === "start") initStart = csend;
      else if (csend.status === "done") return true;
      return false;
    });

  if (!initStart) return <div>Missing init_start</div>;

  const startToInit = initStart.date.getTime() - request.createdAt.getTime();

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableBody>
            <TableRow
              sx={{
                background: startToInit > MAX_TIME_LOAD ? "#faa" : undefined,
              }}
            >
              <TableCell>
                Request <code>start()</code> until container <code>init()</code>{" "}
                called:
              </TableCell>
              <TableCell align="right">
                {nf.format(startToInit / 1000)}s
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <div style={{ height: "6px" }} />
      <ByContainerRow
        csends={csends}
        info={initStart.payload as PayloadInitStart}
        marginBottom={5}
        startRequestId={request.startRequestId}
      />
    </Box>
  );
}

/*
function removeAll() {
  const Requests = db.collection("bananaRequests");
  const docs = Requests.find().toArraySync();
  for (const { _id } of docs) Requests._remove(_id);
  alert("done");
}
*/

function RequestRow({
  request,
  isAdmin,
}: {
  request: BananaRequest;
  isAdmin: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const times = request.times;

  return (
    <>
      <TableRow
        sx={{
          "&:last-child td, &:last-child th": { border: 0 },
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell align="left" style={{ whiteSpace: "nowrap" }}>
          {request.callInputs.PROVIDER_ID === 2 ||
          request.callInputs.PROVIDER_ID === "kiri"
            ? "2️⃣"
            : "1️⃣"}
          {request.createdAt.toLocaleTimeString()}
          <IconButton sx={{ padding: 0, opacity: open ? 1 : 0.3 }}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell
          align="right"
          style={{
            color:
              times?.load && times.load > MAX_TIME_LOAD ? "#a00" : undefined,
          }}
        >
          {times?.load && nf.format(times.load / 1000)}
        </TableCell>
        <TableCell
          align="right"
          style={{
            color:
              times?.init && times.init > MAX_TIME_INIT ? "#a00" : undefined,
          }}
        >
          {times?.init && nf.format(times.init / 1000)}
        </TableCell>
        <TableCell
          align="right"
          style={{
            color:
              times?.inference && times.inference > MAX_TIME_INFERENCE
                ? "#a00"
                : undefined,
          }}
        >
          {times?.inference && nf.format(times.inference / 1000)}
        </TableCell>
        <TableCell
          align="right"
          style={{
            color:
              request.totalTime && request.totalTime > MAX_TIME_TOTAL
                ? "#a00"
                : undefined,
          }}
        >
          {request.totalTime
            ? nf.format(request.totalTime / 1000) // + " s"
            : request.message}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={5}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>{request.createdAt.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>{request.callInputs.MODEL_ID}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pipeline</TableCell>
                    <TableCell>{request.callInputs.PIPELINE}</TableCell>
                  </TableRow>
                  {request.callInputs.custom_pipeline_method && (
                    <TableRow>
                      <TableCell>Method</TableCell>
                      <TableCell>
                        {request.callInputs.custom_pipeline_method}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>Scheduler</TableCell>
                    <TableCell>{request.callInputs.SCHEDULER}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>CallID</TableCell>
                    <TableCell>{request.callID}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      Dimensions: {request.modelInputs.width}x
                      {request.modelInputs.height}, steps:{" "}
                      {request.modelInputs.num_inference_steps}x
                    </TableCell>
                  </TableRow>
                  {isAdmin && (
                    <TableRow>
                      <TableCell>Prompt</TableCell>
                      <TableCell>{request.modelInputs.prompt}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <RequestRowContainer request={request} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function Requests() {
  const bananaRequestsSub = useGongoSub(
    "bananaRequests",
    {},
    {
      sort: ["createdAt", "desc"],
      limit: 50,
      minInterval: 500,
      maxInterval: 1000,
      persist: false,
    }
  );

  const userId = useGongoUserId();
  const user = userId && db.collection("users").findOne(userId);
  const isAdmin = !!(user && user.admin);

  const requests = useGongoLive((db) =>
    db
      .collection("bananaRequests")
      .find()
      // .find({
      //  createdAt: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
      // })
      .sort("createdAt", "desc")
  );

  React.useEffect(() => {
    // @ts-expect-error: todo
    const pollInterval = db.transport.options.pollInterval;
    // @ts-expect-error: todo
    db.transport.options.pollInterval = 1000;
    // @ts-expect-error: todo
    return () => (db.transport.options.pollInterval = pollInterval);
  }, []);

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table
          aria-label="simple table"
          size="small"
          sx={{ tableLayout: "fixed" }}
        >
          <TableHead>
            <TableRow>
              <TableCell align="left" width={115}>
                Date
              </TableCell>
              <TableCell align="right">Load (s)</TableCell>
              <TableCell align="right">Init (s)</TableCell>
              <TableCell align="right">Infer (s)</TableCell>
              <TableCell align="right">Total (s)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <RequestRow
                key={request._id}
                request={request}
                isAdmin={isAdmin}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button onClick={() => bananaRequestsSub.loadMore()}>Load More</Button>
    </Box>
  );
}

const Logs: NextPage = () => {
  /*
  const csendsSub = useGongoSub(
    "csends",
    {},
    { sort: ["date", "desc"], limit: 50 }
  );

  const csends = useGongoLive((db) =>
    db
      .collection("csends")
      .find()
      // .find({ date: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) } })
      .sort("date", "desc")
  );
  */

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <MyAppBar title={t`Event Log`} />
      <Container maxWidth="lg">
        <br />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="Requests" />
            {/* <Tab label="Containers" /> */}
            {/* <Tab label="C_Events" /> */}
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <Requests />
        </TabPanel>
        {/*
        <TabPanel value={value} index={1}>
          <ByContainer csends={csends} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ContainerEvents csends={csends} />
        </TabPanel>
        <Button onClick={() => csendsSub && csendsSub.loadMore()}>
          Load more CSends
        </Button>
        <br />
        <Button onClick={removeAll}>Clear Log Database and Archive</Button>
        */}
      </Container>
    </>
  );
};

export default Logs;
