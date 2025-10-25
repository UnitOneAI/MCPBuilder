import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  GitHub as GitHubIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import mcpLogo from "../assets/mcp-logo.png";
import mcpLogoInv from "../assets/mcp-logo-inv.png";
import unitoneLogo from "../assets/UNITONE_logo.png";
import discordIcon from "../assets/discord-icon.svg";
import Footer from "./Footer";

const drawerWidth = 280;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/", type: "icon" },
  {
    text: "MCP Servers",
    icon: mcpLogo,
    iconInv: mcpLogoInv,
    path: "/mcp-servers",
    type: "image",
  },
  {
    text: "Create Server",
    icon: <AddIcon />,
    path: "/create-server",
    type: "icon",
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ overflow: "auto", mt: 2, flexGrow: 1 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5, px: 2 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  "&.Mui-selected": {
                    backgroundColor: "#020618",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "#030a24",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "white",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color:
                      location.pathname === item.path ? "white" : "inherit",
                  }}
                >
                  {item.type === "image" ? (
                    <Box
                      component="img"
                      src={
                        location.pathname === item.path
                          ? (item.iconInv as string)
                          : (item.icon as string)
                      }
                      alt={item.text}
                      sx={{
                        width: 24,
                        height: 24,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          pt: 2,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight="600"
          sx={{ px: 2, mb: 1, display: "block" }}
        >
          Help & Support
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href="https://discord.com/invite/zA5zUe7Jqr"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderRadius: 1,
                py: 0.5,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Box
                  component="img"
                  src={discordIcon}
                  alt="Discord"
                  sx={{
                    width: 20,
                    height: 20,
                    filter: "grayscale(100%) brightness(1.1)",
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary="Discord"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href="https://github.com/UnitOneAI/MCPBuilder"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderRadius: 1,
                py: 0.5,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GitHubIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="GitHub"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "#020618",
          borderRadius: 0,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box
            component="img"
            src={unitoneLogo}
            alt="UNITONE"
            sx={{
              height: 32,
              mr: 2,
              objectFit: "contain",
            }}
          />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: 700, color: "#ffffff" }}
          >
            UNITONE
          </Typography>
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: 700,
                color: "#ffffff",
                display: { xs: "none", sm: "block" },
              }}
            >
              MCP BUILDER
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<GitHubIcon />}
            href="https://github.com/UnitOneAI/MCPBuilder"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: "#ffffff",
              borderColor: "#ffffff",
              textTransform: "none",
              display: { xs: "none", md: "flex" },
              "&:hover": {
                borderColor: "#ffffff",
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            Star on GitHub
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          ml: { xs: 0, lg: `${drawerWidth}px` },
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flexGrow: 1,
            pt: { xs: 2, md: 3 },
            pb: { xs: 2, md: 3 },
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {children}
        </Box>
        <Footer />
      </Box>
    </>
  );
}

export default Layout;
