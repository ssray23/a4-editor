# A4 Editor

A modern, web-based WYSIWYG document editor that creates professional A4-formatted documents with beautiful styling and advanced formatting capabilities. Built with React and designed for creating visually appealing documents with tables, statistics, timelines, and more.

## 🚀 Features Overview

### 📝 Content Elements
- **Headings** (H1, H2, H3) with theme color support
- **Paragraphs** with rich text formatting and HTML support
- **Tables** with advanced editing and formatting capabilities
- **Stat Grids** for displaying metrics and key performance indicators
- **Fact Boxes** for highlighting important information
- **Cards** with rich text formatting for structured content
- **Timelines** for chronological content presentation
- **Citations** for references and academic sources
- **Horizontal Dividers** for content separation

### ✨ Rich Text Editing
- **Universal Bold Button** - appears in toolbar when text is selected
- **Visual State Feedback** - button shows white (unformatted) or black (bold)
- **WYSIWYG Editing** - what you see is exactly what you get
- **HTML Preservation** - maintains formatting in export and import
- **Keyboard Shortcuts** - Ctrl+B for bold formatting anywhere

### 🎨 Theme & Customization
- **Color Picker** - customize theme color throughout document
- **Theme Toggle** - apply theme colors to headings and dividers
- **Real-time Updates** - see changes immediately
- **Persistent Settings** - theme preferences saved across sessions
- **Professional Styling** - clean, modern design aesthetic

### 📊 Advanced Table Editor
- **Dynamic Size** - starts as 3x3, expand/contract as needed
- **Rich Text in Cells** - full HTML formatting support including bold
- **Column Resizing** - drag handles for precise width control
- **Row/Column Management** - add/delete with intuitive controls
- **Header Editing** - click-to-edit column headers
- **Cell-Level Formatting** - bold text preserved in export
- **Professional Styling** - theme colors, borders, alternating rows

### 🔄 Document Management
- **Drag & Drop Reordering** - rearrange content blocks easily
- **Smart Insertion** - new elements added after currently selected block
- **Auto-Selection** - newly created blocks are immediately selected
- **Context-Aware Placement** - intelligent content positioning
- **Real-time Persistence** - automatic saving to localStorage

### 📤 Export & Import
- **HTML Export** - complete standalone documents
- **Import Previous Exports** - reload and continue editing
- **Format Preservation** - all styling and formatting maintained
- **No Dependencies** - exported files work anywhere
- **Professional Output** - print-ready A4 formatting

## 🛠️ How to Use

### Getting Started
1. **Open the Editor** - Start with a default document template
2. **Add Content** - Use toolbar buttons to insert different content types
3. **Edit Content** - Click on any element to edit it inline
4. **Format Text** - Select text and use the bold button (B) in the toolbar
5. **Customize Theme** - Use the color picker (🎨) to match your brand
6. **Reorder Content** - Drag and drop elements to reorganize
7. **Export** - Click "Export HTML" to save your document

### Content Creation Workflow

#### Text Elements
- **📃 H1, H2, H3** - Click to add headings, type to edit
- **📄 Paragraph** - Click to add text blocks with rich formatting
- **💡 Fact Box** - Highlighted information with left border
- **🎴 Card** - Styled content boxes with background and shadow
- **📚 Citation** - Italicized text for references

#### Advanced Elements
- **📊 Table** - Professional tables with full editing capabilities
- **📈 Stat Grid** - 3-column metrics display with editable values
- **⏰ Timeline** - Chronological events with year and description
- **➖ Divider** - Horizontal lines for content separation

### Rich Text Editing

#### Universal Bold Formatting
- **Smart Detection** - Bold button appears when editing text elements
- **Visual Feedback** - Button color indicates current formatting state:
  - **White Button** - Text is not bold, click to make bold
  - **Black Button** - Text is bold, click to remove bold
- **Persistent Button** - Stays visible while editing for easy access
- **Works Everywhere** - Paragraphs, cards, facts, citations, table cells

#### Text Formatting Process
1. **Click into any text element** (paragraph, card, etc.)
2. **Select text** you want to format
3. **Bold button (B) appears** in the toolbar
4. **Click B or press Ctrl+B** to toggle bold formatting
5. **Formatting preserved** in both editor and export

### Table Editing Mastery

#### Creating and Basic Editing
1. **Add Table** - Click table button (📊) to create 3x3 table
2. **Edit Headers** - Click on column headers to rename
3. **Edit Cells** - Click in any cell to start typing
4. **Rich Formatting** - Select text in cells and use bold button

#### Advanced Table Management
- **Column Resizing**:
  - Hover between column headers to see resize cursor
  - Drag left/right to adjust column width
  - Changes apply immediately
- **Row Operations**:
  - Click ➕ at end of any row to add new row below
  - Click ❌ button in row to delete that row
- **Column Operations**:
  - Click ➕ at bottom of table to add new column
  - Click ❌ in header to delete that column

#### Table Cell Formatting
- **Bold Text** - Select text in any cell, use bold button or Ctrl+B
- **HTML Support** - Formatting preserved in export
- **Text Wrapping** - Long text wraps naturally within cells
- **Professional Styling** - Alternating row colors, theme-colored headers

### Theme Customization

#### Color System
- **🎨 Color Picker** - Click to open theme color selector
- **H Theme Toggle** - Switch between black and theme-colored headings
- **Real-time Updates** - Changes apply immediately to all elements
- **Persistent Settings** - Theme choices saved in browser

#### Theme-Aware Elements
- **Headings** - Can use theme color when toggle is enabled
- **Table Headers** - Always use theme color for professional look
- **Fact Boxes** - Left border matches theme color
- **Stats Grids** - Background and text colors use theme
- **Timelines** - Border and year highlights use theme color
- **Dividers** - Line color follows theme or stays black

### Smart Content Management

#### Intelligent Insertion
- **Context-Aware** - New elements inserted after currently selected block
- **Logical Fallback** - When nothing selected, adds to end
- **Auto-Selection** - New blocks immediately selected for editing
- **Visual Feedback** - Clear indication of current selection

#### Content Organization
- **Drag & Drop** - Click and drag any element to reorder
- **Visual Indicators** - Clear selection outlines and controls
- **Delete Controls** - Click 🗑️ on any selected element to remove
- **Persistent State** - Document structure saved automatically

### Export & Import Features

#### Export Process
1. **Click "📤 Export HTML"** in toolbar
2. **Complete Document** - Generates standalone HTML file
3. **Embedded CSS** - All styling included, no external dependencies
4. **Format Preservation** - Exact appearance maintained
5. **Professional Output** - A4-sized, print-ready document

#### Import Process
1. **Click "📥 Import HTML"** in toolbar
2. **Select File** - Choose previously exported HTML file
3. **Automatic Parsing** - Recreates all content blocks
4. **Format Recognition** - Maintains all text formatting
5. **Editable Document** - Continue editing imported content

## 🔧 Technical Architecture

### Built With
- **React 19** - Latest React features with modern hooks
- **@hello-pangea/dnd** - Smooth drag and drop functionality
- **react-color** - Professional color picker component
- **CSS-in-JS** - Dynamic theme system with real-time updates

### Data Structure
Documents stored as block arrays with this structure:
```javascript
{
  id: "unique-id",
  type: "h1|h2|h3|p|table|stat-grid|fact|card|timeline|citation|hr",
  html: "content", // HTML content for text blocks
  table: { // For table blocks
    cols: ["Header 1", "Header 2"],
    rows: [["Cell 1", "Cell 2"]],
    colWidths: {0: 150, 1: 200},
    boldCells: ["0-1", "1-2"]
  },
  stats: [...], // For stat-grid blocks
  events: [...] // For timeline blocks
}
```

### Theme System
- **Dynamic CSS Generation** - Theme colors injected into CSS templates
- **Real-time Updates** - Styles change immediately when theme modified
- **localStorage Persistence** - Theme preferences saved automatically
- **Fallback Handling** - Graceful degradation if storage fails

### Rich Text Engine
- **ContentEditable Elements** - Native browser text editing
- **HTML Preservation** - Maintains formatting tags in content
- **Universal Bold Detection** - Scans DOM for formatting state
- **Cross-Element Consistency** - Same formatting experience everywhere

## 💾 Data Persistence

### Automatic Saving
- **Real-time Persistence** - Changes saved immediately to localStorage
- **Multiple Keys**:
  - `a4.blocks.v2` - Document content and structure
  - `a4.theme` - Selected theme color
  - `a4.useThemeColor` - Theme toggle state
- **Error Handling** - Graceful fallback if localStorage unavailable
- **Version Management** - Data structure versioning for future updates

### Export Format
- **Standalone HTML** - Complete documents with embedded CSS
- **A4 Formatting** - Professional print-ready layout
- **Cross-Platform** - Works on any device/browser
- **No Dependencies** - Exported files completely self-contained

## 🎯 Professional Features

### A4 Document Formatting
- **Standard Dimensions** - 21cm × 29.7cm with proper margins
- **Typography** - Helvetica font family throughout
- **Professional Spacing** - Consistent margins and padding
- **Print Optimization** - Clean output for PDF generation

### Visual Design System
- **Consistent Styling** - Unified design language across all elements
- **Theme Integration** - Color coordination throughout document
- **Responsive Layout** - Scales appropriately for different screen sizes
- **Touch-Friendly** - Works well on tablets and mobile devices

### Enterprise-Ready
- **No Server Required** - Runs entirely in browser
- **Privacy Focused** - All data stays on user's device
- **Fast Performance** - Optimized React architecture
- **Cross-Browser** - Works on all modern browsers

## 🚀 Getting Started

### Installation & Setup
```bash
# Clone the repository
git clone <repository-url>
cd a4-editor

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Development
- **Hot Reload** - Changes reflect immediately during development
- **Modern React** - Uses latest React 19 features
- **Clean Code** - Well-structured, maintainable codebase
- **No External APIs** - Fully self-contained application

### Deployment
- **Static Site** - Deploy anywhere static sites are supported
- **Build Output** - Standard React build process
- **No Environment Variables** - No configuration required
- **CDN Ready** - Optimized for content delivery networks

## 📋 Usage Tips & Tricks

### Efficient Workflow
1. **Start with Structure** - Add headings and major sections first
2. **Use Cards for Organization** - Group related content in cards
3. **Tables for Data** - Perfect for comparisons and structured information
4. **Stats for Metrics** - Highlight key numbers with stat grids
5. **Dividers for Separation** - Clean breaks between sections

### Formatting Best Practices
- **Consistent Theming** - Choose one theme color and stick with it
- **Selective Bold** - Use bold sparingly for emphasis
- **Logical Hierarchy** - Use H1 → H2 → H3 in order
- **White Space** - Let content breathe with proper spacing

### Advanced Techniques
- **Mixed Content Cards** - Combine bold headers with regular text
- **Responsive Tables** - Design tables that work at different sizes
- **Color Coordination** - Match theme to your brand colors
- **Export Strategy** - Test exports early and often

## 🤝 Contributing

This project welcomes contributions! Whether it's bug reports, feature requests, or code contributions, all are appreciated.

### Areas for Enhancement
- Additional text formatting options (italic, underline, colors)
- Image and media support
- More export formats (PDF, Word, Markdown)
- Collaborative editing features
- Template library and presets
- Advanced table features (cell merging, custom borders)

## 📄 License

MIT License - feel free to use this project for personal and commercial purposes.

---

**A4 Editor** - Professional document creation, simplified. 📄✨