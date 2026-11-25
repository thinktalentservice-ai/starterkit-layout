import { useLayoutEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Home, LayoutGrid, Settings, Users } from "lucide-react";
import { FullLayout } from "./FullLayout";
import { ProfileMenu } from "./ProfileMenu";
import type { NavItem } from "./types";

/** Icons are nodes, not class names: the stories load no icon font. */
const icon = (node: React.ReactNode) => node;

const navItems: NavItem[] = [
  { navigationId: 1, title: "Dashboard", href: "/", icon: icon(<Home size={18} />) },
  { caption: "Workspace" },
  { navigationId: 2, title: "Team", href: "/team", icon: icon(<Users size={18} />) },
  { navigationId: 3, title: "Notifications", href: "/notifications", icon: icon(<Bell size={18} />), suffix: "3" },
  {
    navigationId: 4,
    title: "Components",
    icon: icon(<LayoutGrid size={18} />),
    children: [
      { navigationId: 41, title: "Buttons", href: "/components/buttons" },
      { navigationId: 42, title: "Cards", href: "/components/cards" },
    ],
  },
  { navigationId: 5, title: "Settings", href: "/settings", icon: icon(<Settings size={18} />) },
];

type Args = React.ComponentProps<typeof FullLayout>;

/** FullLayout is fully controlled, so the story owns the two booleans the host would. */
function Controlled(args: Args) {
  const [mini, setMini] = useState(Boolean(args.miniSidebar));
  const [drawer, setDrawer] = useState(false);
  return (
    <FullLayout
      {...args}
      miniSidebar={mini}
      mobileSidebarOpen={drawer}
      onToggleMini={() => setMini((v) => !v)}
      onToggleMobile={() => setDrawer((v) => !v)}
      onCloseMobile={() => setDrawer(false)}
    >
      <h1 className="h4 mb-2">Page content</h1>
      <p>Hover the collapsed sidebar, toggle it from the topbar, or shrink the viewport below 992px.</p>
    </FullLayout>
  );
}

const meta = {
  title: "Shell/FullLayout",
  component: FullLayout,
  render: (args) => <Controlled {...args} />,
  args: {
    navItems,
    sidebarUser: { initials: "AL", name: "Ada Lovelace" },
    roleBadge: "Reviewer",
    profile: {
      initials: "AL",
      menu: <ProfileMenu name="Ada Lovelace" email="ada@example.test" logoutHref="/logout" />,
    },
  },
} satisfies Meta<typeof FullLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

/** The collapsed rail: icons only, widening to the full sidebar on hover. */
export const Mini: Story = { args: { miniSidebar: true } };

export const Rtl: Story = { args: { isRTL: true } };

/** Light scheme: the content column and topbar go light, the RAIL STAYS DARK with
 *  white ink (1.7.0) — `.il-sidebar-area` reads `--sidebar-bg` / `--sidebar-fg*`,
 *  not the scheme's `--fg1/--fg2`. The attribute goes on `<html>`, as in a host. */
export const LightScheme: Story = {
  decorators: [(Story) => <LightRoot><Story /></LightRoot>],
};

/** Sets the scheme attribute on `<html>` for this story only, and removes it on
 *  unmount so the next story is not left in light. */
function LightRoot({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-mui-color-scheme", "light");
    return () => root.removeAttribute("data-mui-color-scheme");
  }, []);
  return <>{children}</>;
}
