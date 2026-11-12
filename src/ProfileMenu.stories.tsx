import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileMenu } from "./ProfileMenu";

const meta = {
  title: "Shell/ProfileMenu",
  component: ProfileMenu,
  parameters: { layout: "centered" },
  args: { name: "Ada Lovelace", email: "ada@example.test", logoutHref: "/logout" },
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

/** A photo that fails to load falls back to initials rather than a broken image. */
export const BrokenPhoto: Story = { args: { photoSrc: "https://invalid.test/none.png" } };

export const NoLogout: Story = { args: { logoutHref: undefined } };
