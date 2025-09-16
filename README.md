# A4 Editor

A modern, web-based WYSIWYG document editor that creates professional A4-formatted documents with beautiful styling. Built with React and designed for creating visually appealing documents with tables, statistics, timelines, and more.

## 🚀 Features

### Document Elements
- **Headings** (H1, H2, H3) with customizable theme colors
- **Paragraphs** with natural text wrapping
- **Tables** with advanced editing capabilities
- **Stat Grids** for displaying metrics and key numbers
- **Fact Boxes** for highlighting important information
- **Timelines** for chronological content
- **Citations** for references and sources

### Advanced Table Editor
- **3x3 default tables** with professional styling
- **WYSIWYG editing** - what you see is what you get
- **Visual styling** with theme colors, borders, and alternating rows
- **Bold formatting** per cell (Ctrl+B or button)
- **Natural text wrapping** in cells
- **Column resizing** with drag handles
- **Add/delete rows and columns** with intuitive controls
- **Header editing** with click-to-edit functionality

### Customization
- **Theme color picker** - customize the accent color throughout
- **Header color toggle** - switch between black and theme-colored headings
- **Drag & drop reordering** of document elements
- **Real-time preview** - see exactly how it will look when printed

### Export & Persistence
- **HTML export** with embedded CSS for sharing
- **Local storage** - automatically saves your work
- **A4 formatting** - optimized for printing and professional documents

## 🛠️ Technical Architecture

### Built With
- **React 19** - Modern React with latest features
- **@hello-pangea/dnd** - Drag and drop functionality
- **react-color** - Color picker component
- **CSS-in-JS** - Dynamic styling with theme support

### Key Components

#### A4Editor (Main Component)
- Manages document state and theme
- Handles block creation, updates, and deletion
- Provides toolbar with content type buttons
- Manages color picker and theme switching

#### BlockEditor (Content Component)
- Renders different content types based on block type
- Handles editing states and user interactions
- Manages table-specific functionality (bold cells, resizing, etc.)
- Provides WYSIWYG editing experience

#### Table System
- **Visual styling** - matches final output during editing
- **ContentEditable divs** - allow natural text wrapping
- **Bold cell tracking** - per-cell formatting state
- **Column resizing** - drag handles with real-time updates
- **Row management** - add/delete with visual feedback

#### Styling System
- **Dynamic CSS injection** - theme colors applied via JavaScript
- **A4 CSS template** - professional document formatting
- **Responsive design** - scales appropriately for different screens
- **Print optimization** - clean output for PDF/print

## 🎯 How It Works

### Document Structure
Documents are stored as an array of blocks, where each block has:
```javascript
{
  id: "unique-id",
  type: "h1|h2|h3|p|table|stat-grid|fact|timeline|citation",
  html: "content", // for text blocks
  table: { // for table blocks
    cols: ["Header 1", "Header 2", "Header 3"],
    rows: [["Cell 1", "Cell 2", "Cell 3"]],
    colWidths: {0: 150, 1: 200}, // column widths in pixels
    boldCells: ["0-1", "1-2"] // bold cell coordinates
  },
  stats: [...], // for stat-grid blocks
  events: [...] // for timeline blocks
}
```

### Theme System
- **CSS Variable Injection** - theme colors inserted into CSS templates
- **Dynamic Styling** - styles updated in real-time when theme changes
- **Template Processing** - `{theme_color}` placeholders replaced with actual values

### Table Editing Flow
1. **Click table** → enters editing mode with visual controls
2. **Focus cell** → shows bold button and selection outline
3. **Type content** → natural text wrapping with proper formatting
4. **Use controls** → add/delete rows/columns, resize, format
5. **Click away** → saves changes and returns to view mode

### Export Process
1. **Generate CSS** - process theme colors into A4.css template
2. **Render HTML** - convert blocks to semantic HTML
3. **Combine** - create complete HTML document with embedded styles
4. **Download** - trigger file download with proper formatting

## 📋 Usage

### Getting Started
1. **Add Content** - Use toolbar buttons to add different content types
2. **Edit Content** - Click on any element to edit it inline
3. **Customize Theme** - Use color picker to match your brand
4. **Arrange Content** - Drag and drop to reorder elements
5. **Export** - Click "Export HTML" to save your document

### Table Editing
1. **Create Table** - Click table button (📊) to add 3x3 table
2. **Edit Cells** - Click in any cell to start typing
3. **Format Text** - Select cell and click **B** or press **Ctrl+B** for bold
4. **Manage Structure**:
   - **Add Row/Column** - Use ➕ buttons
   - **Delete Row** - Click × button in row
   - **Delete Column** - Click × button in header
   - **Resize Column** - Drag the resize handle between headers

### Keyboard Shortcuts
- **Ctrl+B** - Toggle bold formatting in table cells
- **Enter** - Finish editing table headers
- **Drag & Drop** - Reorder document elements

## 🎨 Styling Features

### Professional A4 Layout
- **21cm × 29.7cm** dimensions with proper margins
- **Helvetica font** throughout for consistency
- **Professional spacing** and typography
- **Print-ready** formatting

### Visual Table Design
- **Theme-colored headers** with white text
- **Alternating row colors** (#ffffff/#f6f6f6)
- **1.5px borders** with rounded corners
- **Proper cell padding** (10px/12px)
- **Bold text support** per cell

### Responsive Design
- **Scales down** on smaller screens
- **Maintains proportions** across devices
- **Touch-friendly** controls on mobile

## 💾 Data Persistence

### Local Storage
- **Automatic saving** - changes saved immediately
- **Version key** - `a4.blocks.v2` for data structure versioning
- **Error handling** - graceful fallback if localStorage fails

### Export Format
- **Standalone HTML** - complete document with embedded CSS
- **No dependencies** - exported files work anywhere
- **Professional styling** - maintains all formatting

## 🚀 Getting Started

### Installation
```bash
npm install
npm start
```

### Build for Production
```bash
npm run build
```

### Deploy to Render
This project is configured for easy deployment to [Render](https://render.com):

1. **Connect Repository** - Link your GitHub repository to Render
2. **Auto-Deploy** - The `render.yaml` file automatically configures:
   - Build command: `npm install && npm run build`
   - Static site serving from `./build` directory
   - SPA routing with fallback to `index.html`
3. **Environment** - No environment variables required for basic deployment

The app will be available at your Render URL once deployed.

## 📝 Current Status

### ✅ Completed Features
- Full document editor with multiple content types
- Advanced table editor with visual styling
- Theme customization with color picker
- Drag & drop reordering
- HTML export functionality
- Local storage persistence
- Professional A4 styling
- Bold formatting in table cells
- Column resizing and row/column management

### 🔄 Recent Updates
- ✅ Fixed React contentEditable warnings
- ✅ HTML export now matches editor appearance exactly with gray background
- ✅ Resolved console warnings for better developer experience

### 🎯 Future Enhancements
- Fix text direction issues
- Add more formatting options (italic, underline)
- Support for images and media
- Collaborative editing features
- More export formats (PDF, Word)
- Template library
- Advanced table features (merge cells, borders)

## 🤝 Contributing

This project is actively developed and welcomes contributions. Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this project for personal and commercial purposes.
