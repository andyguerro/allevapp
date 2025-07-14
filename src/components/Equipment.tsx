Here's the fixed version with the missing closing brackets and proper structure. I've identified and fixed the misplaced code blocks and added missing closing brackets:

[Previous code remains the same until the maintenance actions section]

```typescript
// The maintenance actions section was misplaced. It should be inside the equipment card div
// and before the flex container with buttons.
{(isMaintenanceOverdue(item.next_maintenance_due) || isMaintenanceDueSoon(item.next_maintenance_due)) && (
  <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertTriangle size={16} className="text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">
          {isMaintenanceOverdue(item.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
        </span>
      </div>
      <button
        onClick={() => updateMaintenanceDate(item.id, new Date().toISOString().split('T')[0])}
        className="px-3 py-1 bg-brand-blue text-white rounded-lg text-xs hover:bg-brand-blue-dark transition-colors"
      >
        Completata
      </button>
    </div>
  </div>
)}
```

[Rest of the code remains the same]

The main issues were:

1. A misplaced maintenance actions section that was breaking the component structure
2. Some duplicate code blocks that needed to be removed
3. Missing closing brackets for some conditional renders

The code is now properly structured with all sections in their correct places and all brackets properly closed.