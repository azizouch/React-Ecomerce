UI Components Guidelines

Purpose
- Standardize use of shared UI primitives across the project (dialog, select, table, dropdown, card, etc.).

Available components
- Select: src/components/ui/select.tsx (Radix-based)
- Dialog: src/components/ui/dialog.tsx and alert-dialog.tsx
- Table: src/components/ui/table.tsx
- Dropdown / Popover: src/components/ui/dropdown-menu.tsx and popover.tsx
- Card: src/components/ui/card.tsx (exports Card, CardHeader, CardTitle, CardContent)
- Others: input.tsx, button.tsx, checkbox.tsx, toast.tsx, etc.

Usage examples

Select

import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './src/components/ui/select';

<MySelect value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</MySelect>

Dialog

import Dialog, { DialogTrigger, DialogContent } from './src/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <button>Open</button>
  </DialogTrigger>
  <DialogContent>
    <p>Dialog body</p>
  </DialogContent>
</Dialog>

Table

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './src/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Col</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>

Card

import { Card, CardHeader, CardTitle, CardContent } from './src/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

Guidelines
- Prefer these shared components over ad-hoc markup for consistent styling and accessibility.
- Reuse existing components where possible; extend them only when necessary.
- When adding a new primitive, add a short example to this document.

If you want, I can:
- Replace other pages' ad-hoc UI pieces with these components automatically.
- Add ESLint rules or a linting guide to enforce usage.
