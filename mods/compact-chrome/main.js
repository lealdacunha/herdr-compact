import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, shared, setShared, updates, layout, openOverlay } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : 44 });
}

export default class WorkspaceChrome extends View {
  button(id, label, action) {
    const t = theme();
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
  }
  render() {
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) {
      const icon = (id, name, label, action, on = false) => div().id(id).size(24).flex_none().flex().items_center().justify_center().relative().rounded(6)
        .text_color(on ? t.foreground : t.muted).when(on, el => el.bg(t.selected)).hover(s => s.bg(t.hover).text_color(t.foreground)).cursor_pointer().tooltip(label)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(action).child(svg(`mods/compact-chrome/${name}.svg`).size(15));
      const root = layout(), panel = find(root, "panel"), body = find(root, "panel-body");
      const enabled = shared("workspace.panels") ?? ["files", "changes"];
      const panelIcon = (id, name, label) => {
        const on = Boolean(panel && !panel.hidden && body?.active === id);
        return icon(`panel-${id}`, name, label, () => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }, on);
      };
      const ready = div().size(6).rounded_full().bg(t.accent).absolute().top(4).right(4);
      return h_flex().size_full().bg(t.chrome).px(6).gap(0).items_center()
        .when(collapsed, el => el.px(0).justify_center())
        .when(!collapsed, el => el
          .child(icon("space-new", "folder-plus", "New space", () => run("space.new")))
          .child(icon("tab-new", "square-plus", "New tab", () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
          .child(icon("machine", "monitor", "Add machine", () => run("mod.open", { name: "machine-add" })))
          .child(div().flex_1().min_w(9).flex().justify_center().child(div().w(1).h(14).bg(t.border)))
          .when(enabled.includes("files"), el => el.child(panelIcon("files", "files", "Files")))
          .when(enabled.includes("changes"), el => el.child(panelIcon("changes", "git-compare", "Changes")))
          .child(icon("ag-sort", shared("agents.sort") === "grouped" ? "layers" : "clock", `Sort agents: ${shared("agents.sort") === "grouped" ? "Grouped by space" : "Priority"}`,
            () => openOverlay({ mod: "compact-agents", kind: "popup", width: 200, height: 140, props: { sortMenu: true } })))
          .child(icon("settings", "settings", "Settings", () => run("app.settings")).when(Boolean(updates().app.ready), el => el.child(ready))))
        .child(icon("sidebar-toggle", "sidebar", collapsed ? "Expand" : "Collapse", toggleSidebar));
    }
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 6 : 14).pr(10).gap(4).items_center().text_size(13.5)
      .when(!collapsed, el => el.child(h_flex().flex_1().gap(8).items_center().child(image("frame/welcome/herdr.png").size(20).rounded(5)).child(div().font_semibold().text_color(t.foreground).child("Herdr"))))
      ;
  }
}
