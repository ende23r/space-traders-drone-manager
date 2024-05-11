import { Box, Tooltip } from "@mui/material";
import { useLocations, useMyAgent } from "./Api";
import { getSystemSymbol } from "./Util";

const scale = 2.5;
const totalWidth = 1600 / scale;
const totalHeight = 1600 / scale;
function StarBox({ star }: { star: any }) {
  return (
    <Tooltip
      title={`${star.symbol} (${star.x}, ${star.y})`}
      followCursor={true}
    >
      <Box
        sx={{
          position: "absolute",
          left: (star.x + 800) / scale,
          top: totalHeight - (star.y + 800) / scale,
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
        width: totalWidth,
        height: totalHeight,
        flexShrink: 0,
        background: "black",
        position: "relative",
      }}
    >
      {stars?.map((star) => <StarBox key={star.symbol} star={star} />)}
    </Box>
  );
}
