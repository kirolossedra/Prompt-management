import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, Tooltip } from "radix-ui";
import { cx } from "../../lib/utils";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function ActionMenu({
  items,
  label = "More actions",
  align = "end",
}: {
  items: ActionMenuItem[];
  label?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <Tooltip.Root>
      <DropdownMenu.Root>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <button className="icon-button" aria-label={label}>
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip-content" sideOffset={8}>{label}</Tooltip.Content>
        </Tooltip.Portal>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu-content" align={align} sideOffset={6} collisionPadding={12}>
            {items.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                {item.separatorBefore ? <DropdownMenu.Separator className="menu-separator" /> : null}
                <DropdownMenu.Item
                  className={cx("menu-item", item.danger && "menu-item--danger")}
                  disabled={item.disabled}
                  onSelect={(event) => {
                    event.preventDefault();
                    item.onSelect();
                  }}
                >
                  {item.icon ? <span className="menu-item__icon">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </DropdownMenu.Item>
              </div>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </Tooltip.Root>
  );
}
