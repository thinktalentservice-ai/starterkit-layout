import type { Meta, StoryObj } from "@storybook/react-vite";
import { Rocket } from "lucide-react";
import { AuthLogo } from "./AuthLogo";
import { BrandMark } from "./BrandMark";
import { Favicon } from "./Favicon";
import { Logo } from "./Logo";

const meta = {
  title: "Shell/Brand",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mark: Story = { render: () => <BrandMark size={48}><Rocket /></BrandMark> };

export const FaviconLockup: Story = {
  render: () => <Favicon brandName="Northwind" mark={<Rocket />} />,
};

export const FaviconCollapsed: Story = {
  render: () => <Favicon brandName="Northwind" mark={<Rocket />} miniSidebar />,
};

export const CompactLogo: Story = { render: () => <Logo mark={<Rocket />} /> };

export const Auth: Story = {
  render: () => <AuthLogo brandName="Northwind" mark={<Rocket />} tagline="Enterprise" />,
};
