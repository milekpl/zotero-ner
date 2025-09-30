-- Create tables for test database
CREATE TABLE creators (
    creatorID INTEGER PRIMARY KEY,
    firstName TEXT,
    lastName TEXT,
    fieldMode INT,
    UNIQUE (lastName, firstName, fieldMode)
);

CREATE TRIGGER insert_creators BEFORE INSERT ON creators  FOR EACH ROW WHEN NEW.firstName='' AND NEW.lastName=''  BEGIN    SELECT RAISE (ABORT, 'Creator names cannot be empty');  END;

CREATE TRIGGER update_creators BEFORE UPDATE ON creators  FOR EACH ROW WHEN NEW.firstName='' AND NEW.lastName=''  BEGIN    SELECT RAISE (ABORT, 'Creator names cannot be empty');  END;

CREATE TABLE itemCreators (
    itemID INT NOT NULL,
    creatorID INT NOT NULL,
    creatorTypeID INT NOT NULL DEFAULT 1,
    orderIndex INT NOT NULL DEFAULT 0,
    PRIMARY KEY (itemID, creatorID, creatorTypeID, orderIndex),
    UNIQUE (itemID, orderIndex),
    FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE,
    FOREIGN KEY (creatorID) REFERENCES creators(creatorID) ON DELETE CASCADE,
    FOREIGN KEY (creatorTypeID) REFERENCES creatorTypes(creatorTypeID)
);

CREATE INDEX itemCreators_creatorTypeID ON itemCreators(creatorTypeID);

-- Create a minimal items table structure for foreign key constraint
CREATE TABLE items (
    itemID INTEGER PRIMARY KEY,
    itemTypeID INT NOT NULL,
    dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dateModified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clientDateModified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    libraryID INT NOT NULL,
    key TEXT NOT NULL,
    version INT NOT NULL DEFAULT 0,
    synced INT NOT NULL DEFAULT 0,
    UNIQUE (libraryID, key)
);

-- Create a minimal creatorTypes table structure for foreign key constraint
CREATE TABLE creatorTypes (
    creatorTypeID INTEGER PRIMARY KEY,
    creatorType TEXT
);

-- Insert test data for creators
INSERT INTO creators (creatorID, firstName, lastName, fieldMode) VALUES
(1, 'Walter', 'Abbott', 0),
(2, 'William S.', 'Fields', 0),
(3, 'Steven', 'Abney', 0),
(4, 'Tara H.', 'Abraham', 0),
(5, 'Katerina', 'Abramova', 0),
(6, 'Mario', 'Villalobos', 0),
(7, 'Marshall', 'Abrams', 0),
(8, 'Samson', 'Abramsky', 0),
(9, 'Charles I.', 'Abramson', 0),
(10, 'Ana M.', 'Chicas-Mosier', 0),
(11, 'James', 'Smith', 0),
(12, 'John', 'Smith', 0),
(13, 'Jane', 'Doe', 0),
(14, 'J.', 'Smith', 0),
(15, 'J.A.', 'Smith', 0),
(16, 'Jean-Alexandre', 'Smith', 0),
(17, 'J. A.', 'Smith', 0),
(18, 'J. Alexander', 'Smith', 0),
(19, 'Alexander', 'Smith', 0),
(20, 'A.', 'Smith', 0);

-- Insert test data for items
INSERT INTO items (itemID, itemTypeID, libraryID, key, version, synced) VALUES
(1, 1, 1, 'ITEM1', 1, 0),
(2, 1, 1, 'ITEM2', 1, 0),
(3, 1, 1, 'ITEM3', 1, 0),
(4, 1, 1, 'ITEM4', 1, 0),
(5, 1, 1, 'ITEM5', 1, 0);

-- Insert test data for creatorTypes
INSERT INTO creatorTypes (creatorTypeID, creatorType) VALUES
(1, 'author'),
(2, 'editor'),
(3, 'translator');

-- Insert test data for itemCreators
INSERT INTO itemCreators (itemID, creatorID, creatorTypeID, orderIndex) VALUES
(1, 1, 1, 0),
(1, 2, 2, 1),
(2, 3, 1, 0),
(3, 4, 1, 0),
(3, 5, 2, 1),
(4, 6, 1, 0),
(4, 7, 2, 1),
(4, 8, 3, 2),
(5, 9, 1, 0),
(5, 10, 2, 1),
(1, 11, 1, 3),  -- Smith, James
(2, 12, 1, 2),  -- Smith, John (different person)
(3, 13, 1, 3),  -- Doe, Jane
(4, 14, 1, 4),  -- Smith, J. (variant of Smith)
(5, 15, 1, 3),  -- Smith, J.A. (another variant of Smith)
(1, 16, 1, 4),  -- Jean-Alexandre Smith
(2, 17, 1, 3),  -- J. A. Smith
(3, 18, 1, 4),  -- J. Alexander Smith
(4, 19, 1, 5),  -- Alexander Smith
(5, 20, 1, 4);  -- A. Smith