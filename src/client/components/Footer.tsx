import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Language as WebIcon } from "@mui/icons-material";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 3,
        px: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
        }}
      >
        {/* Left section - Project info */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>UNITONE MCP Builder</strong> - Open Source MIT Licensed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Build Model Context Protocol servers from API specifications
          </Typography>
        </Box>

        {/* Center section - Website Link */}
        <Box>
          <Link
            href="https://unitone.ai"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <WebIcon fontSize="small" /> unitone.ai
          </Link>
        </Box>

        {/* Right section - Copyright */}
        <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Typography variant="caption" color="text.secondary">
            © {currentYear} UNITONE Inc. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Footer;
