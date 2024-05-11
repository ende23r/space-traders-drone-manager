import { Box, Tooltip } from "@mui/material";
import { useLocations, useMyAgent } from "./Api";
import { getSystemSymbol } from "./Util";

const scale = 2.5;
function StarBox({ star }: { star: any }) {
  return (
    <Tooltip title={star.symbol} followCursor={true}>
      <Box
        sx={{
          position: "absolute",
          top: (star.x + 800) / scale,
          left: (star.y + 800) / scale,
          width: 7,
          height: 7,
          background: "white",
        }}
      />
    </Tooltip>
  );
}

export default function StarMap() {
  const { agent } = useMyAgent();
  const systemSymbol = getSystemSymbol(agent.headquarters || "");
  const { data: stars } = useLocations(systemSymbol);
  // To represent a grid that goes from approx -800 to 800, we divide all positions by 2.
  return (
    <Box
      sx={{
        width: 1600 / scale,
        height: 1600 / scale,
        flexShrink: 0,
        background: "black",
        position: "relative",
      }}
    >
      {stars?.map((star) => <StarBox key={star.symbol} star={star} />)}
    </Box>
  );
}
